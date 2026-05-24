
import { useState, useEffect } from 'react';

export type CheckStatus = 'pending' | 'success' | 'fail' | 'warning';

export interface Requirement {
    id: string;
    category: string;
    label: string;
    type: 'search' | 'manual';
    measurementPoint: 'center' | 'edge'; // Where to start the route: centroid or closest vertex
    maxDistanceWalk?: number;   // meters
    maxTimeTransport?: number;  // minutes
    description: string;
    searchKeyword?: string;     // Primary keyword (legacy compat)
    /** Lista de termos de busca alternativos — cobre nomenclaturas brasileiras */
    searchKeywords?: string[];  // Multi-term search for Brazilian naming conventions
    abbrev: string;             // Short 3-letter code for the map pin label
}

export interface CheckItem extends Requirement {
    status: CheckStatus;
    currentDistance?: string;
    currentDuration?: string;
    address?: string;
    modeUsed?: 'WALKING' | 'TRANSIT';
}

/**
 * Requirements extracted from Portaria MCID Nº 725/2023
 * for MCMV-FAR/FDS "Inserção Urbana" criteria.
 * All distances in meters, times in minutes.
 */
const REQUIREMENTS: Requirement[] = [
    // ─── INFRAESTRUTURA ──────────────────────────────────────────────────────────
    {
        id: 'infra_drainage',
        category: 'Infraestrutura',
        label: 'Drenagem Pluvial',
        type: 'manual',
        measurementPoint: 'edge',
        maxDistanceWalk: 500,
        description: 'Boca de lobo / Galeria pluvial existente — marque o ponto na rede',
        abbrev: 'DRE'
    },
    {
        id: 'infra_sewage',
        category: 'Infraestrutura',
        label: 'Rede de Esgoto',
        type: 'manual',
        measurementPoint: 'edge',
        maxDistanceWalk: 500,
        description: 'Poço de visita / Rede coletora de esgoto — marque o ponto na rede',
        abbrev: 'ESG'
    },
    {
        id: 'infra_water',
        category: 'Infraestrutura',
        label: 'Rede de Água',
        type: 'manual',
        measurementPoint: 'edge',
        maxDistanceWalk: 500,
        description: 'Ponto de abastecimento / Hidrômetro próximo — marque o ponto na rede',
        abbrev: 'AGU'
    },
    {
        id: 'infra_paving',
        category: 'Infraestrutura',
        label: 'Pavimentação',
        type: 'manual',
        measurementPoint: 'edge',
        maxDistanceWalk: 500,
        description: 'Via pavimentada no entorno imediato — marque o ponto na via',
        abbrev: 'PAV'
    },
    {
        id: 'infra_lighting',
        category: 'Infraestrutura',
        label: 'Iluminação Pública',
        type: 'manual',
        measurementPoint: 'edge',
        maxDistanceWalk: 500,
        description: 'Ponto de iluminação pública no entorno imediato — marque o ponto na rede',
        abbrev: 'ILU'
    },

    // ─── EDUCAÇÃO ────────────────────────────────────────────────────────────────
    {
        id: 'school_creche',
        category: 'Educação',
        label: 'Educação Infantil (Creche/Pré)',
        type: 'search',
        measurementPoint: 'center',
        maxDistanceWalk: 1000,
        maxTimeTransport: 15,
        description: 'Creche ou Pré-escola pública (0-5 anos)',
        searchKeyword: 'creche',
        // Nomenclaturas brasileiras: EMEI = Escola Municipal de Ensino Infantil,
        // CMEI = Centro Municipal de Educação Infantil, CEI = Centro de Educação Infantil
        searchKeywords: ['creche', 'EMEI', 'CMEI', 'CEI', 'escola infantil', 'educação infantil', 'pré-escola'],
        abbrev: 'CRE'
    },
    {
        id: 'school_fund1',
        category: 'Educação',
        label: 'Ens. Fund. Ciclo I (6-10 anos)',
        type: 'search',
        measurementPoint: 'center',
        maxDistanceWalk: 1000,
        maxTimeTransport: 15,
        description: 'Escola Ens. Fundamental I pública',
        searchKeyword: 'escola ensino fundamental',
        // EMEF = Escola Municipal de Ensino Fundamental, EE = Escola Estadual, EM = Escola Municipal
        searchKeywords: ['EMEF', 'escola municipal', 'escola estadual', 'ensino fundamental', 'escola pública'],
        abbrev: 'EF1'
    },
    {
        id: 'school_fund2',
        category: 'Educação',
        label: 'Ens. Fund. Ciclo II (11-14 anos)',
        type: 'search',
        measurementPoint: 'center',
        maxDistanceWalk: 1000,
        maxTimeTransport: 15,
        description: 'Escola Ens. Fundamental II pública',
        searchKeyword: 'escola ensino fundamental',
        searchKeywords: ['EMEF', 'escola municipal', 'escola estadual', 'ensino fundamental', 'escola pública'],
        abbrev: 'EF2'
    },

    // ─── SAÚDE ───────────────────────────────────────────────────────────────────
    {
        id: 'ubs',
        category: 'Saúde',
        label: 'UBS / Saúde da Família',
        type: 'search',
        measurementPoint: 'center',
        maxDistanceWalk: 1000,
        maxTimeTransport: 15,
        description: 'Unidade Básica de Saúde ou UPA / ESF',
        searchKeyword: 'UBS',
        // UBS, UPA, UBDS, AME, ESF = Estratégia Saúde da Família, posto de saúde
        searchKeywords: ['UBS', 'UPA', 'posto de saúde', 'unidade de saúde', 'ESF', 'UBDS', 'AME', 'saúde da família'],
        abbrev: 'UBS'
    },

    // ─── ASSISTÊNCIA SOCIAL ──────────────────────────────────────────────────────
    {
        id: 'cras',
        category: 'Assistência Social',
        label: 'CRAS',
        type: 'search',
        measurementPoint: 'center',
        maxDistanceWalk: 2000,  // 2km conforme Portaria 725
        maxTimeTransport: 25,   // 25 min transporte conforme Portaria 725
        description: 'Centro de Referência de Assistência Social',
        searchKeyword: 'CRAS',
        searchKeywords: ['CRAS', 'assistência social', 'CREAS', 'centro de referência'],
        abbrev: 'CRA'
    },

    // ─── COMÉRCIO ────────────────────────────────────────────────────────────────
    {
        id: 'commerce_daily',
        category: 'Comércio e Serviços',
        label: 'Comércio Cotidiano',
        type: 'search',
        measurementPoint: 'center',
        maxDistanceWalk: 1000,  // 1km conforme Portaria 725
        description: 'Padaria, farmácia, mercadinho ou mercearia',
        searchKeyword: 'padaria farmácia mercado',
        searchKeywords: ['padaria', 'farmácia', 'mercado', 'mercearia', 'minimercado'],
        abbrev: 'DIA'
    },
    {
        id: 'commerce_occasional',
        category: 'Comércio e Serviços',
        label: 'Comércio Eventual',
        type: 'search',
        measurementPoint: 'center',
        maxDistanceWalk: 1500,  // 1,5km conforme Portaria 725
        maxTimeTransport: 20,   // 20 min transporte conforme Portaria 725
        description: 'Supermercado, banco, lotérica ou correios',
        searchKeyword: 'supermercado banco',
        searchKeywords: ['supermercado', 'banco', 'correios', 'lotérica', 'agência bancária'],
        abbrev: 'EVE'
    },

    // ─── MOBILIDADE ──────────────────────────────────────────────────────────────
    {
        id: 'bus_stop',
        category: 'Mobilidade',
        label: 'Ponto de Ônibus / Terminal',
        type: 'search',
        measurementPoint: 'center',
        maxDistanceWalk: 1000,  // 1km conforme Portaria 725
        description: 'Ponto de embarque/desembarque de transporte coletivo',
        searchKeyword: 'ponto de ônibus',
        searchKeywords: ['ponto de ônibus', 'parada de ônibus', 'terminal', 'estação de ônibus'],
        abbrev: 'ONI'
    },
];

export const usePortariaChecks = () => {
    const [checklist, setChecklist] = useState<CheckItem[]>(
        REQUIREMENTS.map(r => ({ ...r, status: 'pending' }))
    );

    // Load from LocalStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('enquadramap_checklist');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Merge saved status with current requirements (in case config changed)
                setChecklist(REQUIREMENTS.map(item => {
                    const savedItem = parsed.find((p: CheckItem) => p.id === item.id);
                    return savedItem
                        ? { ...item, status: savedItem.status, currentDistance: savedItem.currentDistance, currentDuration: savedItem.currentDuration, address: savedItem.address, modeUsed: savedItem.modeUsed }
                        : { ...item, status: 'pending' as CheckStatus };
                }));
            } catch (e) {
                console.error("Failed to load checklist", e);
            }
        }
    }, []);

    // Save to LocalStorage on change
    useEffect(() => {
        localStorage.setItem('enquadramap_checklist', JSON.stringify(checklist));
    }, [checklist]);

    const updateCheckResult = (id: string, result: {
        distanceValue: number; // meters
        durationValue: number; // seconds
        distanceText: string;
        durationText: string;
        address: string;
        mode: 'WALKING' | 'TRANSIT';
    }) => {
        setChecklist(prev => prev.map(item => {
            if (item.id !== id) return item;

            let status: CheckStatus = 'fail';
            const durationMinutes = result.durationValue / 60;

            if (result.mode === 'WALKING' && item.maxDistanceWalk) {
                if (result.distanceValue <= item.maxDistanceWalk) status = 'success';
            } else if (result.mode === 'TRANSIT' && item.maxTimeTransport) {
                if (durationMinutes <= item.maxTimeTransport) status = 'success';
            }

            return {
                ...item,
                status,
                currentDistance: result.distanceText,
                currentDuration: result.durationText,
                address: result.address,
                modeUsed: result.mode,
            };
        }));
    };

    const updateManualStatus = (id: string, isSuccess: boolean) => {
        setChecklist(prev => prev.map(item => {
            if (item.id !== id) return item;
            const newStatus = isSuccess ? 'success' : 'fail';
            // Toggle back to pending if clicking the same active state
            return {
                ...item,
                status: item.status === newStatus ? 'pending' : newStatus
            };
        }));
    };

    const resetChecklist = () => {
        const fresh = REQUIREMENTS.map(r => ({ ...r, status: 'pending' as CheckStatus }));
        setChecklist(fresh);
        localStorage.removeItem('enquadramap_checklist');
    };

    const loadChecklist = (loadedChecklist: CheckItem[]) => {
        setChecklist(loadedChecklist);
        localStorage.setItem('enquadramap_checklist', JSON.stringify(loadedChecklist));
    };

    const resetItem = (id: string) => {
        setChecklist(prev => prev.map(item => {
            if (item.id !== id) return item;
            return { ...item, status: 'pending' as CheckStatus, currentDistance: undefined, currentDuration: undefined, address: undefined, modeUsed: undefined };
        }));
    };

    return { checklist, updateCheckResult, updateManualStatus, resetChecklist, resetItem, loadChecklist };
};
