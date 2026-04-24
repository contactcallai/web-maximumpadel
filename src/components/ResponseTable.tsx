import React, { useState } from 'react';
import './ResponseTable.css';

interface ResponseTableProps {
    schema: Record<string, { 
        title: string; 
        order_index?: number; 
        type?: 'TEXT' | 'SELECT' | 'CHECKBOX'; 
        options?: string[];
        group?: string;
    }>;
    responses: Array<{
        responseId: string;
        answers: Record<string, string>;
    }>;
    renderActions?: (response: any) => React.ReactNode;
    onValueChange?: (responseId: string, questionId: string, newValue: string) => void;
    dirtyRows?: Set<string>;
}

interface EditingCell {
    respId: string;
    qId: string;
}

export default function ResponseTable({ schema, responses, renderActions, onValueChange, dirtyRows }: ResponseTableProps) {
    const [editingCell, setEditingCell] = useState<EditingCell | null>(null);

    const questionIds = Object.keys(schema).sort((a, b) => {
        const orderA = schema[a].order_index ?? 999;
        const orderB = schema[b].order_index ?? 999;
        return orderA - orderB;
    });

    if (responses.length === 0) {
        return (
            <div className="empty-responses">
                <p>No hay respuestas disponibles para este formulario.</p>
            </div>
        );
    }

    const startEdit = (respId: string, qId: string) => {
        if (onValueChange && schema[qId].type !== 'CHECKBOX') {
            setEditingCell({ respId, qId });
        }
    };

    const commitEdit = () => {
        setEditingCell(null);
    };

    const renderCell = (respId: string, qId: string, value: string) => {
        const qInfo = schema[qId];
        const isEditing = editingCell?.respId === respId && editingCell?.qId === qId;
        const displayValue = value || '-';

        // Legal/Checkbox fields: always read-only as plain text
        if (qInfo.type === 'CHECKBOX') {
            return <span className="cell-text readonly-legal">{displayValue}</span>;
        }

        // SELECT: show display text, on click show a select
        if (qInfo.type === 'SELECT') {
            if (isEditing) {
                return (
                    <select
                        className="cell-select"
                        value={value || ""}
                        autoFocus
                        onChange={(e) => {
                            onValueChange?.(respId, qId, e.target.value);
                            setEditingCell(null); // auto-close after selection
                        }}
                        onBlur={(e) => {
                            if (e.target.value !== value) {
                                onValueChange?.(respId, qId, e.target.value);
                            }
                            commitEdit();
                        }}
                    >
                        {!value && <option value="" disabled hidden>Seleccionar...</option>}
                        {qInfo.options?.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                );
            }
            return (
                <span
                    className="cell-text cell-text--editable"
                    onClick={() => startEdit(respId, qId)}
                    title="Clic para editar"
                >
                    {displayValue}
                    <span className="edit-hint">✎</span>
                </span>
            );
        }

        // TEXT: show display text, on click show textarea
        if (isEditing) {
            return (
                <textarea
                    className="cell-textarea"
                    defaultValue={value}
                    autoFocus
                    rows={Math.max(1, Math.ceil(value.length / 30))}
                    onBlur={(e) => {
                        onValueChange?.(respId, qId, e.target.value);
                        commitEdit();
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') commitEdit();
                    }}
                />
            );
        }
        return (
            <span
                className="cell-text cell-text--editable"
                onClick={() => startEdit(respId, qId)}
                title="Clic para editar"
            >
                {displayValue}
                <span className="edit-hint">✎</span>
            </span>
        );
    };

    return (
        <div className="table-container">
            <div className="table-wrapper">
                <table className="response-table">
                    <thead>
                        <tr>
                            {questionIds.map(id => (
                                <th key={id}>{schema[id].title}</th>
                            ))}
                            {renderActions && <th className="actions-header">Acciones</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {responses.map((resp, index) => {
                            const isDirty = dirtyRows?.has(resp.responseId);
                            return (
                                <tr key={resp.responseId} className={isDirty ? 'dirty-row' : ''} data-response-id={resp.responseId}>
                                    {questionIds.map((id, cellIndex) => (
                                        <td key={id} className="table-cell" style={{ position: 'relative' }}>
                                            {isDirty && cellIndex === 0 && <span className="dirty-indicator" title="Cambios sin sincronizar" style={{ position: 'absolute', left: '4px', top: '50%', transform: 'translateY(-50%)' }}></span>}
                                            {renderCell(resp.responseId, id, resp.answers[id] || '')}
                                        </td>
                                    ))}
                                    {renderActions && (
                                        <td className="actions-cell">
                                            {renderActions(resp)}
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
