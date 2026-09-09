/* AUTO from scripts/dump-parramatta-rooms.js — QT Parramatta CODE only. */
window.PLAN2D_ROOMS = {
  "grand": {
    "id": "grand",
    "name": "Grand Ballroom",
    "group": "ballroom",
    "heightM": 4,
    "bayCount": 3,
    "caps": {
      "theatre": 180,
      "classroom": 120,
      "cocktail": 180,
      "banquet": 140,
      "u-shape": 60,
      "cabaret": 120,
      "boardroom": 48
    },
    "L": 27.36,
    "W": 11.36,
    "room": [
      [
        13.68,
        -5.68
      ],
      [
        13.68,
        2.11
      ],
      [
        -13.68,
        5.68
      ],
      [
        -13.68,
        -5.68
      ]
    ],
    "holes": [
      {
        "id": "col1",
        "x": 2.8,
        "z": -0.16,
        "w": 0.85,
        "d": 0.85
      },
      {
        "id": "col2",
        "x": -5.19,
        "z": 0.44,
        "w": 0.85,
        "d": 0.85
      }
    ],
    "doors": [
      {
        "kind": "guest",
        "a": [
          11.94,
          -5.68
        ],
        "b": [
          10.14,
          -5.68
        ]
      },
      {
        "kind": "guest",
        "a": [
          7.24,
          -5.68
        ],
        "b": [
          5.44,
          -5.68
        ]
      },
      {
        "kind": "guest",
        "a": [
          1.44,
          -5.68
        ],
        "b": [
          0.04,
          -5.68
        ]
      },
      {
        "kind": "guest",
        "a": [
          -2.16,
          -5.68
        ],
        "b": [
          -3.56,
          -5.68
        ]
      },
      {
        "kind": "service",
        "a": [
          -7.36,
          -5.68
        ],
        "b": [
          -8.76,
          -5.68
        ]
      },
      {
        "kind": "fire",
        "a": [
          13.68,
          -5.68
        ],
        "b": [
          13.68,
          -4.16
        ]
      },
      {
        "kind": "fire",
        "a": [
          -13.68,
          -5.68
        ],
        "b": [
          -13.68,
          -4.16
        ]
      }
    ],
    "neighbours": [
      {
        "label": "Prefunction",
        "pts": [
          [
            13.68,
            -18.68
          ],
          [
            13.68,
            -5.68
          ],
          [
            2.8,
            -5.68
          ],
          [
            2.8,
            -18.68
          ]
        ]
      },
      {
        "label": "Corridor",
        "pts": [
          [
            2.8,
            -9.46
          ],
          [
            2.8,
            -5.68
          ],
          [
            -13.68,
            -5.68
          ],
          [
            -13.68,
            -9.46
          ]
        ]
      },
      {
        "label": "Balcony",
        "pts": [
          [
            13.68,
            2.11
          ],
          [
            13.68,
            3.34
          ],
          [
            -13.68,
            6.94
          ],
          [
            -13.68,
            5.68
          ]
        ]
      }
    ],
    "screens": [
      {
        "x": -9.9871,
        "z": 4.6435,
        "w": 4,
        "d": 0.16
      },
      {
        "x": -0.0712,
        "z": 3.3496,
        "w": 4,
        "d": 0.16
      },
      {
        "x": 9.8448,
        "z": 2.0558,
        "w": 4,
        "d": 0.16
      }
    ],
    "source": {
      "venueMap": "qt-paramatta-3d-hotel/src/lib/venue-map.ts roomSheet()",
      "roomsMeta": "qt-paramatta-3d-hotel/src/lib/rooms.ts",
      "note": "Plan envelope is roomSheet() trapezoid/poly, not rooms.ts 30×15 estimate. See ballroom-metres.ts."
    }
  },
  "grand-1": {
    "id": "grand-1",
    "name": "Grand Ballroom 1",
    "group": "ballroom",
    "heightM": 4,
    "bayCount": 1,
    "caps": {
      "theatre": 60,
      "classroom": 40,
      "cocktail": 60,
      "banquet": 48,
      "u-shape": 28,
      "cabaret": 40,
      "boardroom": 20
    },
    "L": 10.88,
    "W": 9.21,
    "room": [
      [
        5.44,
        -4.6
      ],
      [
        5.44,
        3.19
      ],
      [
        -5.44,
        4.6
      ],
      [
        -5.44,
        -4.6
      ]
    ],
    "holes": [],
    "doors": [
      {
        "kind": "guest",
        "a": [
          3.7,
          -4.6
        ],
        "b": [
          1.9,
          -4.6
        ],
        "label": "Entry"
      },
      {
        "kind": "guest",
        "a": [
          -1,
          -4.6
        ],
        "b": [
          -2.8,
          -4.6
        ],
        "label": "Entry"
      },
      {
        "kind": "fire",
        "a": [
          5.44,
          -4.6
        ],
        "b": [
          5.44,
          -3.08
        ],
        "label": "Fire exit"
      }
    ],
    "neighbours": [
      {
        "label": "Grand 2",
        "pts": [
          [
            -5.44,
            -4.6
          ],
          [
            -5.44,
            4.6
          ],
          [
            -13.43,
            5.65
          ],
          [
            -13.43,
            -4.6
          ]
        ]
      },
      {
        "label": "Prefunction",
        "pts": [
          [
            5.44,
            -17.6
          ],
          [
            5.44,
            -4.6
          ],
          [
            -5.44,
            -4.6
          ],
          [
            -5.44,
            -17.6
          ]
        ]
      },
      {
        "label": "Corridor",
        "pts": [
          [
            -5.44,
            -8.38
          ],
          [
            -5.44,
            -4.6
          ],
          [
            -21.92,
            -4.6
          ],
          [
            -21.92,
            -8.38
          ]
        ]
      },
      {
        "label": "Balcony",
        "pts": [
          [
            5.44,
            3.19
          ],
          [
            5.44,
            4.42
          ],
          [
            -21.92,
            8.02
          ],
          [
            -21.92,
            6.76
          ]
        ]
      }
    ],
    "screens": [
      {
        "x": -0.0712,
        "z": 3.3496,
        "w": 4,
        "d": 0.16
      }
    ],
    "source": {
      "venueMap": "qt-paramatta-3d-hotel/src/lib/venue-map.ts roomSheet()",
      "roomsMeta": "qt-paramatta-3d-hotel/src/lib/rooms.ts",
      "note": "Plan envelope is roomSheet() trapezoid/poly, not rooms.ts 30×15 estimate. See ballroom-metres.ts."
    }
  },
  "grand-2": {
    "id": "grand-2",
    "name": "Grand Ballroom 2",
    "group": "ballroom",
    "heightM": 4,
    "bayCount": 1,
    "caps": {
      "theatre": 60,
      "classroom": 40,
      "cocktail": 60,
      "banquet": 48,
      "u-shape": 28,
      "cabaret": 40,
      "boardroom": 20
    },
    "L": 7.99,
    "W": 10.25,
    "room": [
      [
        3.99,
        -5.13
      ],
      [
        4,
        4.08
      ],
      [
        -3.99,
        5.13
      ],
      [
        -4,
        -5.13
      ]
    ],
    "holes": [],
    "doors": [
      {
        "kind": "guest",
        "a": [
          2.64,
          -5.13
        ],
        "b": [
          1.24,
          -5.13
        ],
        "label": "Entry"
      },
      {
        "kind": "guest",
        "a": [
          -0.96,
          -5.13
        ],
        "b": [
          -2.37,
          -5.13
        ],
        "label": "Entry"
      }
    ],
    "neighbours": [
      {
        "label": "Grand 1",
        "pts": [
          [
            14.88,
            -5.13
          ],
          [
            14.88,
            2.66
          ],
          [
            4,
            4.08
          ],
          [
            3.99,
            -5.13
          ]
        ]
      },
      {
        "label": "Grand 3",
        "pts": [
          [
            -4,
            -5.13
          ],
          [
            -3.99,
            5.13
          ],
          [
            -12.48,
            6.23
          ],
          [
            -12.48,
            -5.13
          ]
        ]
      },
      {
        "label": "Prefunction",
        "pts": [
          [
            14.88,
            -18.13
          ],
          [
            14.88,
            -5.13
          ],
          [
            3.99,
            -5.13
          ],
          [
            3.99,
            -18.13
          ]
        ]
      },
      {
        "label": "Corridor",
        "pts": [
          [
            3.99,
            -8.91
          ],
          [
            3.99,
            -5.13
          ],
          [
            -12.48,
            -5.13
          ],
          [
            -12.48,
            -8.91
          ]
        ]
      },
      {
        "label": "Balcony",
        "pts": [
          [
            14.88,
            2.66
          ],
          [
            14.88,
            3.89
          ],
          [
            -12.48,
            7.49
          ],
          [
            -12.48,
            6.23
          ]
        ]
      }
    ],
    "screens": [
      {
        "x": -0.0712,
        "z": 4.0594,
        "w": 4,
        "d": 0.16
      }
    ],
    "source": {
      "venueMap": "qt-paramatta-3d-hotel/src/lib/venue-map.ts roomSheet()",
      "roomsMeta": "qt-paramatta-3d-hotel/src/lib/rooms.ts",
      "note": "Plan envelope is roomSheet() trapezoid/poly, not rooms.ts 30×15 estimate. See ballroom-metres.ts."
    }
  },
  "grand-3": {
    "id": "grand-3",
    "name": "Grand Ballroom 3",
    "group": "ballroom",
    "heightM": 4,
    "bayCount": 1,
    "caps": {
      "theatre": 60,
      "classroom": 40,
      "cocktail": 60,
      "banquet": 48,
      "u-shape": 28,
      "cabaret": 40,
      "boardroom": 20
    },
    "L": 8.49,
    "W": 11.36,
    "room": [
      [
        4.24,
        -5.68
      ],
      [
        4.24,
        4.57
      ],
      [
        -4.24,
        5.68
      ],
      [
        -4.24,
        -5.68
      ]
    ],
    "holes": [],
    "doors": [
      {
        "kind": "service",
        "a": [
          2.08,
          -5.68
        ],
        "b": [
          0.67,
          -5.68
        ],
        "label": "Service"
      },
      {
        "kind": "fire",
        "a": [
          -4.24,
          -5.68
        ],
        "b": [
          -4.24,
          -4.16
        ],
        "label": "Fire exit"
      }
    ],
    "neighbours": [
      {
        "label": "Grand 2",
        "pts": [
          [
            12.24,
            -5.68
          ],
          [
            12.24,
            3.53
          ],
          [
            4.24,
            4.57
          ],
          [
            4.24,
            -5.68
          ]
        ]
      },
      {
        "label": "Corridor",
        "pts": [
          [
            12.24,
            -9.46
          ],
          [
            12.24,
            -5.68
          ],
          [
            -4.24,
            -5.68
          ],
          [
            -4.24,
            -9.46
          ]
        ]
      },
      {
        "label": "Balcony",
        "pts": [
          [
            23.12,
            2.11
          ],
          [
            23.12,
            3.34
          ],
          [
            -4.24,
            6.94
          ],
          [
            -4.24,
            5.68
          ]
        ]
      }
    ],
    "screens": [
      {
        "x": -0.0712,
        "z": 4.5807,
        "w": 4,
        "d": 0.16
      }
    ],
    "source": {
      "venueMap": "qt-paramatta-3d-hotel/src/lib/venue-map.ts roomSheet()",
      "roomsMeta": "qt-paramatta-3d-hotel/src/lib/rooms.ts",
      "note": "Plan envelope is roomSheet() trapezoid/poly, not rooms.ts 30×15 estimate. See ballroom-metres.ts."
    }
  },
  "grand-12": {
    "id": "grand-12",
    "name": "Grand Ballroom 1+2",
    "group": "ballroom",
    "heightM": 4,
    "bayCount": 2,
    "caps": {
      "theatre": 120,
      "classroom": 80,
      "cocktail": 120,
      "banquet": 96,
      "u-shape": 48,
      "cabaret": 80,
      "boardroom": 36
    },
    "L": 18.87,
    "W": 10.25,
    "room": [
      [
        9.44,
        -5.13
      ],
      [
        9.44,
        2.66
      ],
      [
        -9.43,
        5.13
      ],
      [
        -9.43,
        -5.13
      ]
    ],
    "holes": [
      {
        "id": "col1",
        "x": -1.45,
        "z": 0.39,
        "w": 0.85,
        "d": 0.85
      }
    ],
    "doors": [
      {
        "kind": "guest",
        "a": [
          7.7,
          -5.13
        ],
        "b": [
          5.9,
          -5.13
        ],
        "label": "Entry"
      },
      {
        "kind": "guest",
        "a": [
          2.99,
          -5.13
        ],
        "b": [
          1.2,
          -5.13
        ],
        "label": "Entry"
      },
      {
        "kind": "guest",
        "a": [
          -2.8,
          -5.13
        ],
        "b": [
          -4.2,
          -5.13
        ],
        "label": "Entry"
      },
      {
        "kind": "guest",
        "a": [
          -6.4,
          -5.13
        ],
        "b": [
          -7.81,
          -5.13
        ],
        "label": "Entry"
      },
      {
        "kind": "fire",
        "a": [
          9.44,
          -5.13
        ],
        "b": [
          9.44,
          -3.61
        ],
        "label": "Fire exit"
      }
    ],
    "neighbours": [
      {
        "label": "Prefunction",
        "pts": [
          [
            9.43,
            -18.13
          ],
          [
            9.44,
            -5.13
          ],
          [
            -1.45,
            -5.13
          ],
          [
            -1.45,
            -18.13
          ]
        ]
      },
      {
        "label": "Corridor",
        "pts": [
          [
            -1.45,
            -8.91
          ],
          [
            -1.45,
            -5.13
          ],
          [
            -17.92,
            -5.13
          ],
          [
            -17.92,
            -8.91
          ]
        ]
      },
      {
        "label": "Balcony",
        "pts": [
          [
            9.44,
            2.66
          ],
          [
            9.44,
            3.89
          ],
          [
            -17.92,
            7.49
          ],
          [
            -17.92,
            6.23
          ]
        ]
      }
    ],
    "screens": [
      {
        "x": -4.749,
        "z": 3.96,
        "w": 4,
        "d": 0.16
      },
      {
        "x": 4.6067,
        "z": 2.7392,
        "w": 4,
        "d": 0.16
      }
    ],
    "source": {
      "venueMap": "qt-paramatta-3d-hotel/src/lib/venue-map.ts roomSheet()",
      "roomsMeta": "qt-paramatta-3d-hotel/src/lib/rooms.ts",
      "note": "Plan envelope is roomSheet() trapezoid/poly, not rooms.ts 30×15 estimate. See ballroom-metres.ts."
    }
  },
  "grand-23": {
    "id": "grand-23",
    "name": "Grand Ballroom 2+3",
    "group": "ballroom",
    "heightM": 4,
    "bayCount": 2,
    "caps": {
      "theatre": 120,
      "classroom": 80,
      "cocktail": 120,
      "banquet": 96,
      "u-shape": 48,
      "cabaret": 80,
      "boardroom": 36
    },
    "L": 16.48,
    "W": 11.36,
    "room": [
      [
        8.24,
        -5.68
      ],
      [
        8.24,
        3.53
      ],
      [
        -8.24,
        5.68
      ],
      [
        -8.24,
        -5.68
      ]
    ],
    "holes": [
      {
        "id": "col1",
        "x": 0.25,
        "z": 0.44,
        "w": 0.85,
        "d": 0.85
      }
    ],
    "doors": [
      {
        "kind": "guest",
        "a": [
          6.88,
          -5.68
        ],
        "b": [
          5.48,
          -5.68
        ],
        "label": "Entry"
      },
      {
        "kind": "guest",
        "a": [
          3.28,
          -5.68
        ],
        "b": [
          1.88,
          -5.68
        ],
        "label": "Entry"
      },
      {
        "kind": "service",
        "a": [
          -1.92,
          -5.68
        ],
        "b": [
          -3.32,
          -5.68
        ],
        "label": "Service"
      },
      {
        "kind": "fire",
        "a": [
          -8.24,
          -5.68
        ],
        "b": [
          -8.24,
          -4.16
        ],
        "label": "Fire exit"
      }
    ],
    "neighbours": [
      {
        "label": "Prefunction",
        "pts": [
          [
            19.12,
            -18.68
          ],
          [
            19.12,
            -5.68
          ],
          [
            8.24,
            -5.68
          ],
          [
            8.24,
            -18.68
          ]
        ]
      },
      {
        "label": "Corridor",
        "pts": [
          [
            8.24,
            -9.46
          ],
          [
            8.24,
            -5.68
          ],
          [
            -8.24,
            -5.68
          ],
          [
            -8.24,
            -9.46
          ]
        ]
      },
      {
        "label": "Balcony",
        "pts": [
          [
            19.12,
            2.11
          ],
          [
            19.12,
            3.34
          ],
          [
            -8.24,
            6.94
          ],
          [
            -8.24,
            5.68
          ]
        ]
      }
    ],
    "screens": [
      {
        "x": -4.1565,
        "z": 4.5925,
        "w": 4,
        "d": 0.16
      },
      {
        "x": 4.0142,
        "z": 3.5264,
        "w": 4,
        "d": 0.16
      }
    ],
    "source": {
      "venueMap": "qt-paramatta-3d-hotel/src/lib/venue-map.ts roomSheet()",
      "roomsMeta": "qt-paramatta-3d-hotel/src/lib/rooms.ts",
      "note": "Plan envelope is roomSheet() trapezoid/poly, not rooms.ts 30×15 estimate. See ballroom-metres.ts."
    }
  },
  "18a": {
    "id": "18a",
    "name": "18A",
    "group": "meeting",
    "heightM": 3,
    "bayCount": 0,
    "caps": {
      "boardroom": 16,
      "theatre": 16,
      "classroom": 12
    },
    "L": 7.16,
    "W": 7.54,
    "room": [
      [
        -3.58,
        3.77
      ],
      [
        -3.58,
        -3.77
      ],
      [
        3.58,
        -3.77
      ],
      [
        3.58,
        3.77
      ]
    ],
    "holes": [],
    "doors": [
      {
        "kind": "guest",
        "a": [
          -3.58,
          0.96
        ],
        "b": [
          -3.58,
          -0.84
        ],
        "label": "Entry"
      },
      {
        "kind": "fire",
        "a": [
          -1.41,
          -3.77
        ],
        "b": [
          -0.01,
          -3.77
        ],
        "label": "Fire exit"
      }
    ],
    "neighbours": [
      {
        "label": "18B",
        "pts": [
          [
            -3.58,
            13.28
          ],
          [
            -3.58,
            4.85
          ],
          [
            3.58,
            4.85
          ],
          [
            3.58,
            13.28
          ]
        ]
      },
      {
        "label": "Prefunction",
        "pts": [
          [
            -9.24,
            13.28
          ],
          [
            -9.24,
            -3.77
          ],
          [
            -3.58,
            -3.77
          ],
          [
            -3.58,
            13.28
          ]
        ]
      },
      {
        "label": "Stairs / store",
        "pts": [
          [
            -9.24,
            -3.77
          ],
          [
            -9.24,
            -4.92
          ],
          [
            3.58,
            -4.92
          ],
          [
            3.58,
            -3.77
          ]
        ]
      }
    ],
    "screens": [
      {
        "x": 0,
        "z": 3.49,
        "w": 1.66,
        "d": 0.16
      }
    ],
    "source": {
      "venueMap": "qt-paramatta-3d-hotel/src/lib/venue-map.ts roomSheet()",
      "roomsMeta": "qt-paramatta-3d-hotel/src/lib/rooms.ts",
      "note": "Plan envelope is roomSheet() trapezoid/poly, not rooms.ts 30×15 estimate. See ballroom-metres.ts."
    }
  },
  "18b": {
    "id": "18b",
    "name": "18B",
    "group": "meeting",
    "heightM": 3,
    "bayCount": 0,
    "caps": {
      "boardroom": 16,
      "theatre": 16,
      "classroom": 12
    },
    "L": 7.16,
    "W": 8.43,
    "room": [
      [
        3.58,
        -4.21
      ],
      [
        3.58,
        4.21
      ],
      [
        -3.58,
        4.21
      ],
      [
        -3.58,
        -4.21
      ]
    ],
    "holes": [],
    "doors": [
      {
        "kind": "guest",
        "a": [
          3.58,
          -0.89
        ],
        "b": [
          3.58,
          0.91
        ],
        "label": "Entry"
      },
      {
        "kind": "fire",
        "a": [
          1.41,
          -4.21
        ],
        "b": [
          0.01,
          -4.21
        ],
        "label": "Fire exit"
      }
    ],
    "neighbours": [
      {
        "label": "18A",
        "pts": [
          [
            3.58,
            5.3
          ],
          [
            3.58,
            12.84
          ],
          [
            -3.58,
            12.84
          ],
          [
            -3.58,
            5.3
          ]
        ]
      },
      {
        "label": "Prefunction",
        "pts": [
          [
            9.24,
            -4.21
          ],
          [
            9.24,
            12.84
          ],
          [
            3.58,
            12.84
          ],
          [
            3.58,
            -4.21
          ]
        ]
      },
      {
        "label": "Terrace",
        "pts": [
          [
            27.74,
            -13.91
          ],
          [
            27.74,
            -4.22
          ],
          [
            3.58,
            -4.21
          ],
          [
            3.58,
            -13.91
          ]
        ]
      }
    ],
    "screens": [
      {
        "x": 0,
        "z": 3.935,
        "w": 1.66,
        "d": 0.16
      }
    ],
    "source": {
      "venueMap": "qt-paramatta-3d-hotel/src/lib/venue-map.ts roomSheet()",
      "roomsMeta": "qt-paramatta-3d-hotel/src/lib/rooms.ts",
      "note": "Plan envelope is roomSheet() trapezoid/poly, not rooms.ts 30×15 estimate. See ballroom-metres.ts."
    }
  },
  "2a": {
    "id": "2a",
    "name": "2A",
    "group": "meeting",
    "heightM": 3.2,
    "bayCount": 0,
    "caps": {
      "theatre": 50,
      "classroom": 30,
      "cocktail": 50,
      "banquet": 40,
      "u-shape": 22,
      "cabaret": 32,
      "boardroom": 20
    },
    "L": 4.82,
    "W": 10.12,
    "room": [
      [
        2.41,
        5.06
      ],
      [
        -2.41,
        5.06
      ],
      [
        -2.41,
        -5.06
      ],
      [
        2.41,
        -5.06
      ]
    ],
    "holes": [],
    "doors": [
      {
        "kind": "guest",
        "a": [
          2.41,
          1.25
        ],
        "b": [
          2.41,
          -0.35
        ],
        "label": "Entry"
      },
      {
        "kind": "fire",
        "a": [
          -2.41,
          -2.55
        ],
        "b": [
          -2.41,
          -3.95
        ],
        "label": "Fire exit"
      }
    ],
    "neighbours": [
      {
        "label": "2B",
        "pts": [
          [
            2.53,
            17.45
          ],
          [
            -1.23,
            18.15
          ],
          [
            -2.41,
            16.65
          ],
          [
            -2.41,
            5.06
          ],
          [
            2.53,
            5.06
          ]
        ]
      },
      {
        "label": "Corridor",
        "pts": [
          [
            11.02,
            8.49
          ],
          [
            2.53,
            8.49
          ],
          [
            2.53,
            5.06
          ],
          [
            11.02,
            5.06
          ]
        ]
      },
      {
        "label": "Dining landing",
        "pts": [
          [
            5.44,
            -5.06
          ],
          [
            -3.37,
            -5.06
          ],
          [
            -3.37,
            -13.83
          ],
          [
            5.44,
            -13.83
          ]
        ]
      }
    ],
    "screens": [
      {
        "x": 0,
        "z": 4.51,
        "w": 2.7,
        "d": 0.16
      }
    ],
    "source": {
      "venueMap": "qt-paramatta-3d-hotel/src/lib/venue-map.ts roomSheet()",
      "roomsMeta": "qt-paramatta-3d-hotel/src/lib/rooms.ts",
      "note": "Plan envelope is roomSheet() trapezoid/poly, not rooms.ts 30×15 estimate. See ballroom-metres.ts."
    }
  },
  "2b": {
    "id": "2b",
    "name": "2B",
    "group": "meeting",
    "heightM": 3,
    "bayCount": 0,
    "caps": {
      "theatre": 30,
      "classroom": 18,
      "cocktail": 30,
      "banquet": 24,
      "u-shape": 16,
      "cabaret": 20,
      "boardroom": 16
    },
    "L": 4.94,
    "W": 13.09,
    "room": [
      [
        2.47,
        5.85
      ],
      [
        -1.29,
        6.55
      ],
      [
        -2.47,
        5.05
      ],
      [
        -2.47,
        -6.54
      ],
      [
        2.47,
        -6.54
      ]
    ],
    "holes": [],
    "doors": [
      {
        "kind": "guest",
        "a": [
          2.47,
          1.84
        ],
        "b": [
          2.47,
          0.24
        ],
        "label": "Entry"
      }
    ],
    "neighbours": [
      {
        "label": "2C",
        "pts": [
          [
            10.96,
            4.94
          ],
          [
            2.47,
            5.85
          ],
          [
            2.47,
            -3.12
          ],
          [
            10.96,
            -3.12
          ]
        ]
      },
      {
        "label": "2A",
        "pts": [
          [
            2.35,
            -6.54
          ],
          [
            -2.47,
            -6.54
          ],
          [
            -2.47,
            -16.67
          ],
          [
            2.35,
            -16.67
          ]
        ]
      },
      {
        "label": "Corridor",
        "pts": [
          [
            10.96,
            -3.12
          ],
          [
            2.47,
            -3.12
          ],
          [
            2.47,
            -6.54
          ],
          [
            10.96,
            -6.55
          ]
        ]
      }
    ],
    "screens": [
      {
        "x": 0.5388,
        "z": 5.9197,
        "w": 1.66,
        "d": 0.16
      }
    ],
    "source": {
      "venueMap": "qt-paramatta-3d-hotel/src/lib/venue-map.ts roomSheet()",
      "roomsMeta": "qt-paramatta-3d-hotel/src/lib/rooms.ts",
      "note": "Plan envelope is roomSheet() trapezoid/poly, not rooms.ts 30×15 estimate. See ballroom-metres.ts."
    }
  },
  "2c": {
    "id": "2c",
    "name": "2C",
    "group": "meeting",
    "heightM": 3,
    "bayCount": 0,
    "caps": {
      "boardroom": 16,
      "theatre": 16,
      "classroom": 12
    },
    "L": 8.96,
    "W": 8.49,
    "room": [
      [
        -3.58,
        4.25
      ],
      [
        -4.48,
        -4.24
      ],
      [
        4.48,
        -4.24
      ],
      [
        4.48,
        4.25
      ]
    ],
    "holes": [],
    "doors": [
      {
        "kind": "guest",
        "a": [
          -0.48,
          -4.24
        ],
        "b": [
          1.12,
          -4.24
        ],
        "label": "Entry"
      },
      {
        "kind": "guest",
        "a": [
          4.48,
          1
        ],
        "b": [
          4.48,
          -0.6
        ],
        "label": "Entry"
      }
    ],
    "neighbours": [
      {
        "label": "2B",
        "pts": [
          [
            -4.48,
            -4.24
          ],
          [
            -5.18,
            -8
          ],
          [
            -3.68,
            -9.18
          ],
          [
            7.91,
            -9.18
          ],
          [
            7.91,
            -4.24
          ]
        ]
      },
      {
        "label": "Corridor",
        "pts": [
          [
            4.48,
            4.25
          ],
          [
            4.48,
            -4.24
          ],
          [
            7.91,
            -4.24
          ],
          [
            7.91,
            4.25
          ]
        ]
      },
      {
        "label": "Store",
        "pts": [
          [
            -5.09,
            7.64
          ],
          [
            -5.09,
            4.25
          ],
          [
            2.08,
            4.25
          ],
          [
            2.08,
            7.64
          ]
        ]
      }
    ],
    "screens": [
      {
        "x": 0.45,
        "z": 3.965,
        "w": 1.66,
        "d": 0.16
      }
    ],
    "source": {
      "venueMap": "qt-paramatta-3d-hotel/src/lib/venue-map.ts roomSheet()",
      "roomsMeta": "qt-paramatta-3d-hotel/src/lib/rooms.ts",
      "note": "Plan envelope is roomSheet() trapezoid/poly, not rooms.ts 30×15 estimate. See ballroom-metres.ts."
    }
  }
};
window.PLAN2D_ROOM_ORDER = ["grand","grand-1","grand-2","grand-3","grand-12","grand-23","18a","18b","2a","2b","2c"];
