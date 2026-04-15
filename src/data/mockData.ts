export const TOURNAMENTS_DATA = [
    {
        id: "t-2024-01",
        name: "Campeonato de Primavera 2024",
        status: "EN CURSO",

        categories: [
            { id: "cat-1m", name: "1ª Masculina" },
            { id: "cat-2m", name: "2ª Masculina" },
            { id: "cat-1f", name: "1ª Femenina" },
            { id: "cat-3f", name: "3ª Femenina" }
        ],

        teams: [
            // --- 1ª MASCULINA (16 EQUIPOS - MAX) ---
            { id: "team-1m-1", name: "Martínez / Silva", categoryId: "cat-1m", size1: "M", size2: "S" },
            { id: "team-1m-2", name: "García / López", categoryId: "cat-1m", size1: "L", size2: "L" },
            { id: "team-1m-3", name: "Rivas / Ortiz", categoryId: "cat-1m", size1: "S", size2: "M" },
            { id: "team-1m-4", name: "Díaz / Moreno", categoryId: "cat-1m", size1: "XL", size2: "L" },
            { id: "team-1m-5", name: "Sánchez / Ruiz", categoryId: "cat-1m", size1: "M", size2: "M" },
            { id: "team-1m-6", name: "Vidal / Castro", categoryId: "cat-1m", size1: "M", size2: "S" },
            { id: "team-1m-7", name: "Navarro / Gil", categoryId: "cat-1m", size1: "L", size2: "L" },
            { id: "team-1m-8", name: "Romero / Cruz", categoryId: "cat-1m", size1: "S", size2: "S" },
            { id: "team-1m-9", name: "Serrano / Vega", categoryId: "cat-1m", size1: "XL", size2: "M" },
            { id: "team-1m-10", name: "Blanco / Molina", categoryId: "cat-1m", size1: "M", size2: "M" },
            { id: "team-1m-11", name: "Iglesias / Vidal", categoryId: "cat-1m", size1: "L", size2: "S" },
            { id: "team-1m-12", name: "Garrido / Sanz", categoryId: "cat-1m", size1: "M", size2: "L" },
            { id: "team-1m-13", name: "Cano / Marín", categoryId: "cat-1m", size1: "XL", size2: "XL" },
            { id: "team-1m-14", name: "Méndez / Ortiz", categoryId: "cat-1m", size1: "S", size2: "M" },
            { id: "team-1m-15", name: "Pérez / Muñoz", categoryId: "cat-1m", size1: "L", size2: "L" },
            { id: "team-1m-16", name: "Gutiérrez / Rubio", categoryId: "cat-1m", size1: "M", size2: "M" },

            // --- 2ª MASCULINA (8 EQUIPOS) ---
            { id: "team-2m-1", name: "Herrera / Peña", categoryId: "cat-2m", size1: "M", size2: "L" },
            { id: "team-2m-2", name: "Flores / Cabrera", categoryId: "cat-2m", size1: "S", size2: "S" },
            { id: "team-2m-3", name: "Mora / Reyes", categoryId: "cat-2m", size1: "L", size2: "M" },
            { id: "team-2m-4", name: "Aguilar / Santana", categoryId: "cat-2m", size1: "XL", size2: "L" },
            { id: "team-2m-5", name: "Lorenzo / Castillo", categoryId: "cat-2m", size1: "M", size2: "M" },
            { id: "team-2m-6", name: "Giménez / Ibáñez", categoryId: "cat-2m", size1: "L", size2: "L" },
            { id: "team-2m-7", name: "Ferrer / Diez", categoryId: "cat-2m", size1: "S", size2: "M" },
            { id: "team-2m-8", name: "Vicente / Arias", categoryId: "cat-2m", size1: "M", size2: "S" },

            // --- 1ª FEMENINA (12 EQUIPOS) ---
            { id: "team-1f-1", name: "López / Gómez", categoryId: "cat-1f", size1: "S", size2: "S" },
            { id: "team-1f-2", name: "Martín / Alonso", categoryId: "cat-1f", size1: "M", size2: "M" },
            { id: "team-1f-3", name: "Díaz / Moreno", categoryId: "cat-1f", size1: "L", size2: "M" },
            { id: "team-1f-4", name: "Pérez / Muñoz", categoryId: "cat-1f", size1: "S", size2: "S" },
            { id: "team-1f-5", name: "Sánchez / Ruiz", categoryId: "cat-1f", size1: "M", size2: "S" },
            { id: "team-1f-6", name: "Vidal / Castro", categoryId: "cat-1f", size1: "L", size2: "L" },
            { id: "team-1f-7", name: "Gutiérrez / Rubio", categoryId: "cat-1f", size1: "M", size2: "M" },
            { id: "team-1f-8", name: "Cano / Marín", categoryId: "cat-1f", size1: "S", size2: "S" },
            { id: "team-1f-9", name: "Méndez / Ortiz", categoryId: "cat-1f", size1: "M", size2: "L" },
            { id: "team-1f-10", name: "Rojas / Medina", categoryId: "cat-1f", size1: "M", size2: "M" },
            { id: "team-1f-11", name: "Cortés / Núñez", categoryId: "cat-1f", size1: "S", size2: "S" },
            { id: "team-1f-12", name: "Blanco / Navarro", categoryId: "cat-1f", size1: "L", size2: "M" },

            // --- 3ª FEMENINA (3 EQUIPOS - MIN) ---
            { id: "team-3f-1", name: "Iglesias / Vidal", categoryId: "cat-3f", size1: "M", size2: "S" },
            { id: "team-3f-2", name: "Garrido / Sanz", categoryId: "cat-3f", size1: "L", size2: "L" },
            { id: "team-3f-3", name: "Romero / Cruz", categoryId: "cat-3f", size1: "S", size2: "S" },
        ],

        cuadros: {
            // --- 1ª MASCULINA: 16 EQUIPOS (4 Grupos) ---
            "cat-1m": {
                groups: [
                    {
                        name: "Grupo A",
                        teamIds: ["team-1m-1", "team-1m-2", "team-1m-3", "team-1m-4"],
                        matches: [
                            { id: "m-1m-a1", homeId: "team-1m-1", awayId: "team-1m-2", date: "2024-04-20T09:00", court: "Pista 1", result: "6-2 / 6-1" },
                            { id: "m-1m-a2", homeId: "team-1m-3", awayId: "team-1m-4", date: "2024-04-20T10:30", court: "Pista 2", result: "" },
                            { id: "m-1m-a3", homeId: "team-1m-1", awayId: "team-1m-3", date: "2024-04-21T09:00", court: "Pista 1", result: "" },
                            { id: "m-1m-a4", homeId: "team-1m-2", awayId: "team-1m-4", date: "2024-04-21T10:30", court: "Pista 3", result: "" },
                            { id: "m-1m-a5", homeId: "team-1m-1", awayId: "team-1m-4", date: "2024-04-22T09:00", court: "Pista 2", result: "" },
                            { id: "m-1m-a6", homeId: "team-1m-2", awayId: "team-1m-3", date: "2024-04-22T10:30", court: "Pista 1", result: "" },
                        ]
                    },
                    {
                        name: "Grupo B",
                        teamIds: ["team-1m-5", "team-1m-6", "team-1m-7", "team-1m-8"],
                        matches: [] // Vacío intencionalmente para probar estados sin jugar
                    },
                    {
                        name: "Grupo C",
                        teamIds: ["team-1m-9", "team-1m-10", "team-1m-11", "team-1m-12"],
                        matches: []
                    },
                    {
                        name: "Grupo D",
                        teamIds: ["team-1m-13", "team-1m-14", "team-1m-15", "team-1m-16"],
                        matches: []
                    }
                ],
                brackets: {
                    cuartos: [
                        { id: "q-1m-1", homeId: "1º Grupo A", awayId: "2º Grupo C", date: "2024-04-23T17:00", result: "" },
                        { id: "q-1m-2", homeId: "1º Grupo B", awayId: "2º Grupo D", date: "2024-04-23T18:30", result: "" },
                        { id: "q-1m-3", homeId: "1º Grupo C", awayId: "2º Grupo A", date: "2024-04-23T17:00", result: "" },
                        { id: "q-1m-4", homeId: "1º Grupo D", awayId: "2º Grupo B", date: "2024-04-23T18:30", result: "" }
                    ],
                    semis: [
                        { id: "s-1m-1", homeId: "Ganador Q1", awayId: "Ganador Q2", date: "2024-04-24T10:00", result: "" },
                        { id: "s-1m-2", homeId: "Ganador Q3", awayId: "Ganador Q4", date: "2024-04-24T11:30", result: "" }
                    ],
                    final: [
                        { id: "f-1m-1", homeId: "Ganador Semi 1", awayId: "Ganador Semi 2", date: "2024-04-25T12:00", result: "" }
                    ]
                }
            },

            // --- 2ª MASCULINA: 8 EQUIPOS (2 Grupos) ---
            "cat-2m": {
                groups: [
                    {
                        name: "Grupo A",
                        teamIds: ["team-2m-1", "team-2m-2", "team-2m-3", "team-2m-4"],
                        matches: [
                            { id: "m-2m-a1", homeId: "team-2m-1", awayId: "team-2m-2", date: "2024-04-20T12:00", court: "Pista 4", result: "4-6 / 7-5 / 6-3" },
                        ]
                    },
                    {
                        name: "Grupo B",
                        teamIds: ["team-2m-5", "team-2m-6", "team-2m-7", "team-2m-8"],
                        matches: []
                    }
                ],
                brackets: {
                    semis: [
                        { id: "s-2m-1", homeId: "1º Grupo A", awayId: "2º Grupo B", date: "2024-04-24T17:00", result: "" },
                        { id: "s-2m-2", homeId: "1º Grupo B", awayId: "2º Grupo A", date: "2024-04-24T18:30", result: "" }
                    ],
                    final: [
                        { id: "f-2m-1", homeId: "Ganador S1", awayId: "Ganador S2", date: "2024-04-25T10:00", result: "" }
                    ]
                }
            },

            // --- 1ª FEMENINA: 12 EQUIPOS (3 Grupos) ---
            "cat-1f": {
                groups: [
                    { name: "Grupo A", teamIds: ["team-1f-1", "team-1f-2", "team-1f-3", "team-1f-4"], matches: [] },
                    { name: "Grupo B", teamIds: ["team-1f-5", "team-1f-6", "team-1f-7", "team-1f-8"], matches: [] },
                    { name: "Grupo C", teamIds: ["team-1f-9", "team-1f-10", "team-1f-11", "team-1f-12"], matches: [] }
                ],
                brackets: {
                    semis: [
                        { id: "s-1f-1", homeId: "1º Grupo A", awayId: "Mejor 2º", date: "2024-04-24T17:00", result: "" },
                        { id: "s-1f-2", homeId: "1º Grupo B", awayId: "1º Grupo C", date: "2024-04-24T18:30", result: "" }
                    ],
                    final: [{ id: "f-1f-1", homeId: "Ganador S1", awayId: "Ganador S2", date: "2024-04-25T11:00", result: "" }]
                }
            },

            // --- 3ª FEMENINA: 3 EQUIPOS (1 Grupo - MINIMO) ---
            "cat-3f": {
                groups: [
                    {
                        name: "Grupo Único",
                        teamIds: ["team-3f-1", "team-3f-2", "team-3f-3"],
                        matches: [
                            { id: "m-3f-1", homeId: "team-3f-1", awayId: "team-3f-2", date: "2024-04-20T19:00", court: "Pista 5", result: "" },
                            { id: "m-3f-2", homeId: "team-3f-1", awayId: "team-3f-3", date: "2024-04-21T20:30", court: "Pista 2", result: "" },
                            { id: "m-3f-3", homeId: "team-3f-2", awayId: "team-3f-3", date: "2024-04-22T19:00", court: "Pista 4", result: "" },
                        ]
                    }
                ],
                brackets: {
                    semis: [],
                    final: [
                        { id: "f-3f-1", homeId: "1º Grupo Único", awayId: "2º Grupo Único", date: "2024-04-24T19:00", result: "" }
                    ]
                }
            }
        }
    },
    {
        id: "t-2023-02",
        name: "Winter Padel Clash 2023",
        status: "COMPLETADO",
        categories: [
            { id: "cat-pro", name: "Categoría PRO Masculina" }
        ],
        teams: [
            { id: "team-pro1", name: "Diaz / Ruiz", categoryId: "cat-pro", size1: "L", size2: "L" },
            { id: "team-pro2", name: "Gomez / Vargas", categoryId: "cat-pro", size1: "XL", size2: "XL" },
            { id: "team-pro3", name: "Tapia / Coello", categoryId: "cat-pro", size1: "M", size2: "M" },
            { id: "team-pro4", name: "Lebrón / Galán", categoryId: "cat-pro", size1: "L", size2: "M" },
            { id: "team-pro5", name: "Stupaczuk / Di Nenno", categoryId: "cat-pro", size1: "S", size2: "S" },
            { id: "team-pro6", name: "Chingotto / Tello", categoryId: "cat-pro", size1: "M", size2: "S" },
            { id: "team-pro7", name: "Navarro / Yanguas", categoryId: "cat-pro", size1: "XL", size2: "L" },
            { id: "team-pro8", name: "Sanz / Nieto", categoryId: "cat-pro", size1: "M", size2: "M" },
        ],
        cuadros: {
            "cat-pro": {
                groups: [], // Torneo completado a eliminación directa
                brackets: {
                    cuartos: [
                        { id: "q-pro-1", homeId: "team-pro1", awayId: "team-pro8", date: "2023-12-13T18:00", result: "6-2 / 6-3" },
                        { id: "q-pro-2", homeId: "team-pro4", awayId: "team-pro5", date: "2023-12-13T19:30", result: "7-6 / 4-6 / 6-4" },
                        { id: "q-pro-3", homeId: "team-pro3", awayId: "team-pro6", date: "2023-12-14T18:00", result: "6-4 / 6-4" },
                        { id: "q-pro-4", homeId: "team-pro2", awayId: "team-pro7", date: "2023-12-14T19:30", result: "6-1 / 6-2" }
                    ],
                    semis: [
                        { id: "s-pro-1", homeId: "team-pro1", awayId: "team-pro4", date: "2023-12-15T10:00", result: "6-4 / 7-5" },
                        { id: "s-pro-2", homeId: "team-pro3", awayId: "team-pro2", date: "2023-12-15T11:30", result: "3-6 / 6-3 / 7-6" }
                    ],
                    final: [
                        { id: "f-pro-1", homeId: "team-pro1", awayId: "team-pro3", date: "2023-12-16T12:00", result: "6-4 / 7-6" }
                    ]
                }
            }
        }
    }
];

// Compatibility exports
export const TOURNAMENTS = TOURNAMENTS_DATA.map(({ teams, cuadros, categories, ...basicInfo }) => ({
    ...basicInfo,
    teams: teams.length
}));