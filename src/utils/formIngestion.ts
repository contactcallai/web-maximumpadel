export interface QuestionMapping {
    questionId: string;
    title: string;
    field?: string;
    group?: 'player1' | 'player2' | 'availability' | 'legal' | 'notes';
    order_index?: number;
    type: 'TEXT' | 'SELECT' | 'CHECKBOX';
    options?: string[];
}

export interface IngestedData {
    tournament_id: string;
    google_response_id: string;
    category: string;
    players: Array<{
        name: string;
        lastName: string;
        phone: string;
        shirtSize: string;
    }>;
    availability: Array<{
        slot: string;
        original_text: string;
        order_index: number;
    }>;
    legal: {
        data: boolean;
        marketing: boolean;
        image: boolean;
    };
    notes: string;
}

export const generateSchemaMap = (schema: any) => {
    const mapping: Record<string, QuestionMapping> = {};
    let currentGroup: QuestionMapping['group'] = undefined;
    let globalOrderIndex = 0;
    let inAvailabilityBlock = false;
    schema.items?.forEach((item: any) => {
        const title = item.title?.toUpperCase() || '';
        
        // Block Detection
        if (title.includes('JUGADOR 1')) currentGroup = 'player1';
        else if (title.includes('JUGADOR 2')) currentGroup = 'player2';
        else if (title.includes('HORARIO DISPONIBLE')) {
            currentGroup = 'availability';
            inAvailabilityBlock = true;
        } else if (title.includes('OBSERVACIONES')) {
            currentGroup = 'notes';
            inAvailabilityBlock = false;
        } else if (title.includes('PROTECCIÓN DE DATOS') || title.includes('LEGAL')) {
            currentGroup = 'legal';
            inAvailabilityBlock = false;
        }

        if (item.questionItem) {
            const qId = item.questionItem.question.questionId;
            const qTitle = item.title || '';
            const qTitleUpper = qTitle.toUpperCase();

            let field = '';
            if (currentGroup === 'player1' || currentGroup === 'player2') {
                if (qTitleUpper.includes('NOMBRE')) field = 'name';
                else if (qTitleUpper.includes('APELLIDO')) field = 'lastName';
                else if (qTitleUpper.includes('TELÉFONO')) field = 'phone';
                else if (qTitleUpper.includes('TALLA')) field = 'shirtSize';
            } else if (currentGroup === 'legal') {
                // If title is empty, look into the first option (common in checklists)
                let searchText = qTitleUpper;
                if (!searchText && item.questionItem.question.choiceQuestion?.options?.[0]) {
                    searchText = item.questionItem.question.choiceQuestion.options[0].value?.toUpperCase() || '';
                }

                if (searchText.includes('DATOS')) field = 'data';
                else if (searchText.includes('COMERCIAL') || searchText.includes('MARKETING')) field = 'marketing';
                else if (searchText.includes('IMAGEN')) field = 'image';
            }

            const qData = item.questionItem.question;
            let type: 'TEXT' | 'SELECT' | 'CHECKBOX' = 'TEXT';
            let options: string[] = [];

            if (qData.choiceQuestion) {
                const qType = qData.choiceQuestion.type;
                if (qType === 'CHECKBOX') {
                    type = 'CHECKBOX';
                } else {
                    type = 'SELECT';
                }
                options = qData.choiceQuestion.options?.map((o: any) => o.value) || [];
            }

            mapping[qId] = {
                questionId: qId,
                title: qTitle,
                field,
                group: currentGroup,
                order_index: globalOrderIndex++,
                type,
                options
            };
        }
    });

    return mapping;
};

export const normalizeResponse = (response: any, mapping: Record<string, QuestionMapping>, tournamentId: string): IngestedData => {
    const result: IngestedData = {
        tournament_id: tournamentId,
        google_response_id: response.responseId,
        category: '',
        players: [
            { name: '', lastName: '', phone: '', shirtSize: '' },
            { name: '', lastName: '', phone: '', shirtSize: '' }
        ],
        availability: [],
        legal: { data: false, marketing: false, image: false },
        notes: ''
    };

    Object.keys(response.answers || {}).forEach(qId => {
        const map = mapping[qId];
        if (!map) return;

        const answerObj = response.answers[qId];
        const value = answerObj.textAnswers?.answers?.[0]?.value || '';

        // Category Check (Generic, handle with/without accent)
        const title = map.title?.toUpperCase() || '';
        if (title.includes('CATEGOR') || title.includes('MODALIDAD')) {
            result.category = value;
        }

        switch (map.group) {
            case 'player1':
                if (map.field) (result.players[0] as any)[map.field] = value;
                break;
            case 'player2':
                if (map.field) (result.players[1] as any)[map.field] = value;
                break;
            case 'availability':
                if (map.order_index !== undefined) {
                    result.availability.push({
                        slot: value,
                        original_text: map.title,
                        order_index: map.order_index
                    });
                }
                break;
            case 'legal':
                if (map.field) {
                    const autorizo = value?.toUpperCase().includes('AUTORIZO') || false;
                    (result.legal as any)[map.field] = autorizo;
                }
                break;
            case 'notes':
                result.notes = value;
                break;
        }
    });

    // Sort availability by index to ensure order
    result.availability.sort((a, b) => a.order_index - b.order_index);

    return result;
};

/** Convierte una inscripción persistida (IngestedData) en respuestas planas por `questionId` para la tabla. */
export function denormalizeRegistrationToAnswers(
    registration: IngestedData,
    mapping: Record<string, QuestionMapping>
): Record<string, string> {
    const answers: Record<string, string> = {};
    let players: IngestedData['players'] = (registration.players || []).map((p) => ({
        name: p.name ?? '',
        lastName: p.lastName ?? '',
        phone: p.phone ?? '',
        shirtSize: p.shirtSize ?? ''
    }));
    if (players.length === 0) {
        players = [
            { name: '', lastName: '', phone: '', shirtSize: '' },
            { name: '', lastName: '', phone: '', shirtSize: '' }
        ];
    } else if (players.length === 1) {
        players = [...players, { name: '', lastName: '', phone: '', shirtSize: '' }];
    }
    const availSorted = [...(registration.availability || [])].sort((a, b) => a.order_index - b.order_index);

    for (const [qId, map] of Object.entries(mapping)) {
        const title = (map.title || '').toUpperCase();
        if (title.includes('CATEGOR') || title.includes('MODALIDAD')) {
            answers[qId] = registration.category || '';
            continue;
        }

        switch (map.group) {
            case 'player1':
                if (map.field) {
                    const v = (players[0] as Record<string, string>)[map.field];
                    answers[qId] = v != null ? String(v).trim() : '';
                }
                break;
            case 'player2':
                if (map.field) {
                    const v = (players[1] as Record<string, string>)[map.field];
                    answers[qId] = v != null ? String(v).trim() : '';
                }
                break;
            case 'availability':
                if (map.order_index !== undefined) {
                    const slot = availSorted.find((a) => a.order_index === map.order_index);
                    answers[qId] = slot?.slot ?? '';
                }
                break;
            case 'legal':
                if (map.field) {
                    const ok = Boolean((registration.legal as Record<string, boolean>)[map.field]);
                    if (map.type === 'CHECKBOX') {
                        answers[qId] = ok ? (map.options?.[0] || 'AUTORIZO') : '';
                    } else {
                        answers[qId] = ok ? (map.options?.[0] || 'Sí') : '';
                    }
                }
                break;
            case 'notes':
                answers[qId] = registration.notes || '';
                break;
            default:
                break;
        }
    }

    return answers;
}
