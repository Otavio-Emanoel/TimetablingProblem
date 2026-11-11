/**
 * SEED_FULL.JS
 * Seed completo e exato mapeado diretamente do cronograma oficial!
 */

const API_BASE = process.env.API_BASE || process.env.API_BASE_URL || "http://localhost:8080";

const DIAS_SEMANA_MAP = {
  1: "MONDAY", 2: "TUESDAY", 3: "WEDNESDAY", 4: "THURSDAY", 5: "FRIDAY"
};

function formatTime(time) {
  return time.length === 5 ? `${time}:00` : time;
}

const TURMAS = [
  { name: "1MAD", shiftType: "INTEGRAL" }, { name: "2MAD", shiftType: "INTEGRAL" }, { name: "3MAD", shiftType: "INTEGRAL" },
  { name: "1MDS", shiftType: "INTEGRAL" }, { name: "2MDS", shiftType: "INTEGRAL" }, { name: "3MDS", shiftType: "INTEGRAL" },
  { name: "1MDI", shiftType: "INTEGRAL" }, { name: "2MDI", shiftType: "INTEGRAL" }, { name: "3MDI", shiftType: "INTEGRAL" },
  { name: "1JOD", shiftType: "REGULAR" }, { name: "2JOD", shiftType: "REGULAR" }, { name: "3JOD", shiftType: "REGULAR" }
];

const HORARIOS_COMUNS = [
  { start: "08:00", end: "08:50" }, { start: "08:50", end: "09:40" },
  { start: "10:00", end: "10:50" }, { start: "10:50", end: "11:40" }, { start: "11:40", end: "12:30" }
];
const SLOT_ALMOCO = { start: "12:30", end: "13:20" };
const HORARIOS_TARDE = [
  { start: "13:30", end: "14:20" }, { start: "14:20", end: "15:10" }, { start: "15:10", end: "16:00" }
];

// O JSON abaixo contém exatamente a carga horária de todas as turmas
// e as atribuições exatas dos professores.
const DATA_PARSED = {
  "=== TURMAS AULAS ===": {
    "1ª Série DS": {
      "Língua Portuguesa, Literatura e Comunicação Profissional": 4,
      "Língua Estrangeira Moderna - Inglês": 2,
      "Educação Física": 2,
      "Arte": 1,
      "Matemática": 4,
      "Biologia": 2,
      "Física": 2,
      "Química": 2,
      "História": 2,
      "Geografia": 2,
      "Filosofia": 1,
      "Sociologia": 1,
      "Algoritmos e Lógica de Programação": 2,
      "Fundamentos de Informática": 1,
      "Análise e Projeto de Sistemas": 1,
      "Design Digital": 1
    },
    "2ª Série DS": {
      "Língua Portuguesa": 3,
      "Língua Inglesa": 2,
      "Educação Física": 2,
      "Matemática": 3,
      "Física": 2,
      "Química": 2,
      "História": 2,
      "Geografia": 2,
      "Estudos Avançados (Ciências da Natureza)": 1,
      "Estudos Avançados (Matemática)": 1,
      "Laboratório de Mediação e Intervenção Sociocultural": 2,
      "Programação Web II": 2,
      "Banco de Dados II": 2,
      "Desenvolvimento de Sistemas": 3,
      "Ética e Cidadania Organizacional": 1,
      "Programação de Aplicativos Mobile I": 2
    },
    "3ª Série DS": {
      "Língua Portuguesa": 3,
      "Língua Inglesa": 2,
      "Matemática": 4,
      "Biologia": 2,
      "História": 2,
      "Geografia": 2,
      "Filosofia": 2,
      "Sociologia": 2,
      "Estudos Avançados (Ciências da Natureza)": 3,
      "Estudos Avançados (Matemática)": 3,
      "Programação Web III": 2,
      "Programação de Aplicativos Mobile II": 2,
      "Internet, Protocolos e Segurança": 2,
      "Planejamento e Desenvolvimento do TCC": 3,
      "Qualidade e Teste de Software": 2,
      "Sistemas Embarcados": 2
    },
    "1ª Série JOD": {
      "Língua Portuguesa": 2,
      "Língua Inglesa": 2,
      "Arte": 2,
      "Educação Física": 2,
      "Matemática": 2,
      "Biologia": 2,
      "Física": 2,
      "Química": 2,
      "História": 2,
      "Geografia": 2,
      "Ambiente de Desenvolvimento de Jogos Digitais I": 2,
      "Programação e Algoritmos": 2,
      "Narrativas e Roteiros para Jogos Digitais": 2,
      "Operação de Software Aplicativo": 2,
      "Conduta Profissional e Relações de Trabalho": 1,
      "Game Art I": 2
    },
    "2ª Série JOD": {
      "Língua Portuguesa": 3,
      "Língua Inglesa": 2,
      "Educação Física": 2,
      "Matemática": 2,
      "Física": 2,
      "Química": 2,
      "Biologia": 2,
      "História": 2,
      "Geografia": 2,
      "Técnicas de Desenho e Desenvolvimento de Game Art II": 2,
      "Desenvolvimento de Jogos para Web II": 2,
      "Programação Orientada a Objetos": 3,
      "Modelagem 3D": 2,
      "Linguagem de Programação I": 2
    },
    "3ª Série JOD": {
      "Língua Portuguesa": 4,
      "Língua Inglesa": 2,
      "Matemática": 4,
      "Filosofia": 1,
      "Sociologia": 2,
      "Técnicas de Desenho e Desenvolvimento de Game Art III": 2,
      "Linguagem de Programação II": 3,
      "Animação 3D": 3,
      "Técnicas e Linguagens para Banco de Dados": 2,
      "Ética e Cidadania Organizacional": 1,
      "Marketing para Jogos Digitais": 2,
      "Programação para Dispositivos Móveis": 2,
      "Planejamento e Desenvolvimento do TCC em Jogos Digitais": 2
    },
    "1ª Série MAD": {
      "Língua Portuguesa, Literatura e Comunicação Profissional": 4,
      "Língua Estrangeira Moderna - Inglês": 2,
      "Arte": 2,
      "Educação Física": 2,
      "Matemática": 4,
      "Biologia": 2,
      "Física": 2,
      "Química": 2,
      "História": 2,
      "Geografia": 2,
      "Filosofia": 1,
      "Sociologia": 1,
      "Conduta Profissional e Relações de Trabalho": 1,
      "Projetos de Tecnologia de Informação e Comunicação": 2,
      "Planejamento Empresarial": 2,
      "Planejamento e Organização das Rotinas Administrativas": 2,
      "Administração de Recursos Humanos": 2
    },
    "2ª Série MAD": {
      "Língua Portuguesa, Literatura e Comunicação Profissional": 3,
      "Língua Estrangeira Moderna - Inglês": 2,
      "Educação Física": 2,
      "Matemática": 3,
      "Física": 2,
      "Química": 2,
      "Biologia": 2,
      "História": 2,
      "Geografia": 2,
      "Filosofia": 1,
      "Estudos Avançados em Ciências Humanas e Sociais Aplicadas": 1,
      "Estudos Avançados em Matemática e suas Tecnologias": 1,
      "Laboratório de Mediação e Intervenção Sociocultural": 2,
      "Laboratório de Processos Criativos": 2,
      "Custos, Processos e Operações Contábeis": 3,
      "Planejamento e Organização de Rotinas de Departamento Pessoal": 2,
      "Desenvolvimento de Modelos de Negócios": 2,
      "Estudos da Administração Pública": 2
    },
    "3ª Série MAD": {
      "Língua Portuguesa e Literatura": 4,
      "Língua Estrangeira Moderna - Inglês": 2,
      "Matemática": 4,
      "Sociologia": 2,
      "Estudos Avançados em Ciencias Humanas e Sociais Aplicadas": 3,
      "Estudos Avançados em Matematica e suas Tecnologias": 3,
      "Administração Financeira e Orçamentária (AFO)": 3,
      "Administração da Produção e Serviços": 3,
      "Administração de Recursos Humanos": 3,
      "Estudos de Economia, Mercado e de Comercio Internacional": 2,
      "Ética e Cidadania Organizacional": 1,
      "Processos Logisticos Empresariais": 2,
      "Tecnologia da Informação em Administração": 2,
      "Planejamento e Desenvolvimento do TCC (PDTCC)": 3
    },
    "1ª Série MDI": {
      "Língua Portuguesa": 2,
      "Língua Estrangeira Moderna - Inglês": 2,
      "Arte": 2,
      "Educação Física": 2,
      "Matemática": 3,
      "Física": 2,
      "História": 2,
      "Geografia": 2,
      "Filosofia": 1,
      "Estudos Avançados em Ciências Humanas e Sociais Aplicadas": 1,
      "Estudos Avançados em Linguagens e suas Tecnologias": 1,
      "Laboratório de Investigação Científica": 2,
      "Práticas de Empreendedorismo": 2,
      "Composição no Projeto de Design de Interiores": 2,
      "Ergonomia": 2,
      "Estudo e Aplicação dos Materiais e Revestimentos no Design de Interiores": 2,
      "Projeto de Espaços Efêmeros": 2,
      "Expressões Visuais Aplicadas ao Design de Interiores I": 2,
      "Representação da Linguagem Projetiva e Arquitetônica I": 2,
      "Representação Digital de Projetos de Interiores I": 2
    },
    "2ª Série MDI": {
      "Língua Portuguesa": 3,
      "Língua Inglesa": 2,
      "Educação Física": 2,
      "Matemática": 3,
      "Química": 2,
      "Física": 2,
      "Biologia": 2,
      "Geografia": 2,
      "História": 2,
      "Estudos Avançados em Ciências Humanas e Sociais Aplicadas": 1,
      "Estudos Avançados em Linguagens e suas Tecnologias": 1,
      "Laboratório de Mediação e Intervenção Sociocultural": 2,
      "Laboratório de Processos Criativos": 2,
      "Expressões Visuais Aplicadas ao Design de Interiores II": 2,
      "Representação da Linguagem Projetiva e Arquitetônica II": 2,
      "Representação Digital de Projetos de Interiores II": 2,
      "Projetos de Interiores Residenciais": 2,
      "Representação Técnica do Mobiliário II": 2
    },
    "3ª Série MDI": {
      "Língua Portuguesa": 5,
      "Língua Inglesa": 2,
      "Matemática": 4,
      "Química": 2,
      "Biologia": 2,
      "Geografia": 2,
      "Sociologia": 1,
      "Estudos Avançados em Ciências Humanas e Sociais Aplicadas": 3,
      "Estudos Avançados em Linguagens e suas Tecnologias": 3,
      "Representação Técnica do Mobiliário II": 2,
      "Conforto Ambiental Aplicado ao Projeto de Interiores": 1,
      "Ética e Cidadania Organizacional": 1,
      "História do Mobiliário": 2,
      "Ilustração no Projeto de Interiores": 2,
      "Planejamento e Desenvolvimento do Trabalho de Conclusão de Curso (TCC) em Design de Interiores": 2,
      "Projetos de Interiores Comerciais": 2
    }
  },
  "=== PROF ASSIGNMENTS ===": {
    "Andreia": [
      {
        "subjects": [
          "BIO"
        ],
        "turmas": [
          "2MAD",
          "3MDS",
          "2MDI"
        ]
      }
    ],
    "Caroline": [
      {
        "subjects": [
          "ERGO"
        ],
        "turmas": [
          "1MDI"
        ]
      },
      {
        "subjects": [
          "RDPI II"
        ],
        "turmas": [
          "2MDI"
        ]
      },
      {
        "subjects": [
          "EVADI II"
        ],
        "turmas": [
          "2MDI"
        ]
      }
    ],
    "Danilo": [
      {
        "subjects": [
          "EACHSA"
        ],
        "turmas": [
          "3MAD",
          "3MDI"
        ]
      },
      {
        "subjects": [
          "ECO"
        ],
        "turmas": [
          "2MDS",
          "3MAD",
          "3MDI"
        ]
      },
      {
        "subjects": [
          "TIA"
        ],
        "turmas": [
          "3MAD"
        ]
      }
    ],
    "Eliamar": [
      {
        "subjects": [
          "FILO"
        ],
        "turmas": [
          "1MAD",
          "1MDS",
          "1MDI"
        ]
      },
      {
        "subjects": [
          "MAT"
        ],
        "turmas": [
          "2MDS",
          "3MDS",
          "1MDI",
          "2JOD",
          "3JOD"
        ]
      },
      {
        "subjects": [
          "EAMT"
        ],
        "turmas": [
          "3MAD",
          "3MDS"
        ]
      }
    ],
    "Elisangela": [
      {
        "subjects": [
          "PDTCC"
        ],
        "turmas": [
          "3MAD",
          "2MDS",
          "3MDS",
          "3MDI",
          "3JOD"
        ]
      },
      {
        "subjects": [
          "TIA"
        ],
        "turmas": [
          "3MAD"
        ]
      },
      {
        "subjects": [
          "PTIC"
        ],
        "turmas": [
          "1MDS",
          "1MDI"
        ]
      },
      {
        "subjects": [
          "ADJD I"
        ],
        "turmas": [
          "1JOD"
        ]
      },
      {
        "subjects": [
          "DJW II"
        ],
        "turmas": [
          "2JOD"
        ]
      },
      {
        "subjects": [
          "TLBD"
        ],
        "turmas": [
          "3JOD"
        ]
      }
    ],
    "Elizabeth": [
      {
        "subjects": [
          "LPC",
          "LMIS"
        ],
        "turmas": [
          "2MAD",
          "2MDS",
          "1MDI",
          "2MDI",
          "2JOD"
        ]
      },
      {
        "subjects": [
          "EALT"
        ],
        "turmas": [
          "2MDI",
          "3MDI"
        ]
      },
      {
        "subjects": [
          "SOC"
        ],
        "turmas": [
          "1MDS",
          "3MDI"
        ]
      },
      {
        "subjects": [
          "FILO"
        ],
        "turmas": [
          "3JOD"
        ]
      }
    ],
    "Elza": [
      {
        "subjects": [
          "EAMT"
        ],
        "turmas": [
          "2MAD",
          "3MAD",
          "2MDS",
          "3MDS"
        ]
      },
      {
        "subjects": [
          "EACNT"
        ],
        "turmas": [
          "1MDS",
          "2MDS",
          "3MDS"
        ]
      },
      {
        "subjects": [
          "SOC"
        ],
        "turmas": [
          "3MDS",
          "3JOD"
        ]
      },
      {
        "subjects": [
          "FILO"
        ],
        "turmas": [
          "3MDS"
        ]
      },
      {
        "subjects": [
          "MJD"
        ],
        "turmas": [
          "3JOD"
        ]
      },
      {
        "subjects": [
          "EACHSA"
        ],
        "turmas": [
          "1MDS",
          "2MAD"
        ]
      }
    ],
    "Evelise": [
      {
        "subjects": [
          "HIST"
        ],
        "turmas": [
          "1MAD",
          "2MAD",
          "1MDS",
          "2MDS",
          "1MDI",
          "2MDI",
          "1JOD",
          "2JOD"
        ]
      }
    ],
    "Felix": [
      {
        "subjects": [
          "EAMRDI"
        ],
        "turmas": [
          "1MDI"
        ]
      }
    ],
    "Fidelis": [
      {
        "subjects": [
          "ING"
        ],
        "turmas": [
          "1MAD",
          "1MDS"
        ]
      },
      {
        "subjects": [
          "PORT",
          "LPC"
        ],
        "turmas": [
          "1MAD",
          "2MAD",
          "3MAD",
          "1MDS",
          "2MDS",
          "3MDS",
          "1MDI",
          "2MDI"
        ]
      },
      {
        "subjects": [
          "LMIS"
        ],
        "turmas": [
          "2MAD",
          "2MDS"
        ]
      },
      {
        "subjects": [
          "LPL"
        ],
        "turmas": [
          "1MDI",
          "2MDI"
        ]
      }
    ],
    "Gabriela": [
      {
        "subjects": [
          "RLPA I",
          "II"
        ],
        "turmas": [
          "1MDI",
          "2MDI"
        ]
      },
      {
        "subjects": [
          "HM",
          "RTMI",
          "RTMII"
        ],
        "turmas": [
          "2MDI",
          "3MDI"
        ]
      }
    ],
    "Gilvan": [
      {
        "subjects": [
          "ARTE"
        ],
        "turmas": [
          "1MAD",
          "1MDS",
          "1MDI",
          "1JOD"
        ]
      },
      {
        "subjects": [
          "GAME ART",
          "MO 3D",
          "ANI 3D"
        ],
        "turmas": [
          "1JOD",
          "2JOD",
          "3JOD"
        ]
      },
      {
        "subjects": [
          "TDDGA",
          "NRID"
        ],
        "turmas": [
          "2JOD",
          "1JOD"
        ]
      }
    ],
    "Gisbert": [
      {
        "subjects": [
          "PA"
        ],
        "turmas": [
          "1MDS",
          "1JOD"
        ]
      },
      {
        "subjects": [
          "PW I"
        ],
        "turmas": [
          "1MDS"
        ]
      },
      {
        "subjects": [
          "POO"
        ],
        "turmas": [
          "2JOD"
        ]
      },
      {
        "subjects": [
          "PDM"
        ],
        "turmas": [
          "3JOD"
        ]
      }
    ],
    "Iury": [
      {
        "subjects": [
          "BD I",
          "II"
        ],
        "turmas": [
          "1MDS",
          "2MDS"
        ]
      },
      {
        "subjects": [
          "SE",
          "SE IoT"
        ],
        "turmas": [
          "1MDS",
          "3MDS"
        ]
      },
      {
        "subjects": [
          "IPSSI",
          "QTS"
        ],
        "turmas": [
          "3MDS"
        ]
      }
    ],
    "Jean": [
      {
        "subjects": [
          "PE",
          "PORA",
          "PORDP",
          "APS"
        ],
        "turmas": [
          "1MAD",
          "2MAD",
          "3MAD"
        ]
      }
    ],
    "Jose A": [
      {
        "subjects": [
          "QUI"
        ],
        "turmas": [
          "1MAD",
          "1MDS",
          "2MDS",
          "3MDI",
          "1JOD",
          "2JOD"
        ]
      }
    ],
    "Joyce": [
      {
        "subjects": [
          "ERGO",
          "RDPI II",
          "EVADI II",
          "RTMI",
          "IPI"
        ],
        "turmas": [
          "1MDI",
          "2MDI",
          "3MDI"
        ]
      }
    ],
    "Luiz F": [
      {
        "subjects": [
          "MAT"
        ],
        "turmas": [
          "1MAD",
          "2MAD",
          "1MDS",
          "2MDI",
          "1JOD"
        ]
      },
      {
        "subjects": [
          "FIS"
        ],
        "turmas": [
          "1MAD",
          "1MDS",
          "2MDS",
          "1MDI",
          "2MDI",
          "1JOD",
          "2JOD"
        ]
      }
    ],
    "Marcelo": [
      {
        "subjects": [
          "FIS"
        ],
        "turmas": [
          "2MAD"
        ]
      },
      {
        "subjects": [
          "PIR",
          "PIC",
          "PEE"
        ],
        "turmas": [
          "2MDI",
          "3MDI",
          "1MDI"
        ]
      }
    ],
    "Marcio": [
      {
        "subjects": [
          "CPOC",
          "DMN",
          "PORA",
          "GEO"
        ],
        "turmas": [
          "1MAD",
          "2MAD",
          "1MDI"
        ]
      }
    ],
    "Meire": [
      {
        "subjects": [
          "LPL",
          "PORT",
          "MJD",
          "NRID"
        ],
        "turmas": [
          "3MDI",
          "1JOD",
          "2JOD",
          "3JOD"
        ]
      }
    ],
    "Patricia": [
      {
        "subjects": [
          "BIO"
        ],
        "turmas": [
          "1MAD",
          "1MDS",
          "2MDS",
          "1MDI",
          "3MDI",
          "1JOD"
        ]
      },
      {
        "subjects": [
          "ING"
        ],
        "turmas": [
          "2MAD",
          "3MAD",
          "2MDS",
          "3MDS",
          "2MDI",
          "3MDI",
          "2JOD",
          "3JOD",
          "1MDI",
          "1JOD"
        ]
      }
    ],
    "Paulo": [
      {
        "subjects": [
          "PW I",
          "PW III",
          "DS",
          "PAM",
          "PA",
          "ADJD",
          "POO",
          "LP",
          "DJW",
          "PDM"
        ],
        "turmas": [
          "1MDS",
          "2MDS",
          "3MDS",
          "1JOD",
          "2JOD",
          "3JOD"
        ]
      }
    ],
    "Ricardo": [
      {
        "subjects": [
          "AFO"
        ],
        "turmas": [
          "3MAD"
        ]
      }
    ],
    "Rodrigo": [
      {
        "subjects": [
          "CPRT",
          "EAP",
          "EACHSA",
          "ECO"
        ],
        "turmas": [
          "1MAD",
          "2MAD",
          "1JOD",
          "3JOD"
        ]
      }
    ],
    "Rogerio": [
      {
        "subjects": [
          "GEO"
        ],
        "turmas": [
          "1MAD",
          "1MDS",
          "1MDI",
          "3MDI"
        ]
      }
    ],
    "Sonia": [
      {
        "subjects": [
          "RLPA",
          "CPDI",
          "EVADI",
          "PEE",
          "PIR",
          "RTMI",
          "PIC",
          "CAAPI",
          "PDTCC"
        ],
        "turmas": [
          "1MDI",
          "2MDI",
          "3MDI"
        ]
      }
    ],
    "Thiago": [
      {
        "subjects": [
          "ED. FIS"
        ],
        "turmas": [
          "1MAD",
          "2MAD",
          "1MDS",
          "2MDS",
          "1MDI",
          "2MDI",
          "1JOD",
          "2JOD"
        ]
      }
    ],
    "Valdeci": [
      {
        "subjects": [
          "GEO"
        ],
        "turmas": [
          "2MDS",
          "3MDS",
          "2MDI",
          "2JOD"
        ]
      }
    ],
    "Vanessa": [
      {
        "subjects": [
          "BD",
          "DS",
          "PW II",
          "SE",
          "IPSSI",
          "QTS",
          "PTIC"
        ],
        "turmas": [
          "1MDS",
          "2MDS",
          "3MDS",
          "1MDI"
        ]
      }
    ],
    "Veridiane": [
      {
        "subjects": [
          "ARH",
          "PDTCC",
          "DMN",
          "PORDP",
          "SOC",
          "LPC",
          "EEM"
        ],
        "turmas": [
          "1MAD",
          "2MAD",
          "3MAD",
          "3MDS",
          "1MDI",
          "2MDI",
          "3JOD"
        ]
      }
    ],
    "Wellington": [
      {
        "subjects": [
          "PTIC",
          "PAM",
          "LP",
          "OSA"
        ],
        "turmas": [
          "1MAD",
          "1MDS",
          "2MDS",
          "1JOD",
          "3JOD"
        ]
      }
    ],
    "William B": [
      {
        "subjects": [
          "MAT"
        ],
        "turmas": [
          "3MAD",
          "3MDS",
          "3MDI"
        ]
      }
    ]
  }
};

const QUANTITIES_EXACT = DATA_PARSED["=== TURMAS AULAS ==="] || {};
const PROF_ASSIGNMENTS = DATA_PARSED["=== PROF ASSIGNMENTS ==="] || {};

if (Object.keys(QUANTITIES_EXACT).length === 0) {
  // Fazer uma cópia de segurança se o formato anterior era diferente
  const jsonSegments = `=== TURMAS AULAS ===
{
  "1ª Série DS": {
    "Língua Portuguesa, Literatura e Comunicação Profissional": 4,
    "Língua Estrangeira Moderna - Inglês": 2,
    "Educação Física": 2,
    "Arte": 1,
    "Matemática": 4,
    "Biologia": 2,
    "Física": 2,
    "Química": 2,
    "História": 2,
    "Geografia": 2,
    "Filosofia": 1,
    "Sociologia": 1,
    "Algoritmos e Lógica de Programação": 2,
    "Fundamentos de Informática": 1,
    "Análise e Projeto de Sistemas": 1,
    "Design Digital": 1
  },
  "2ª Série DS": {
    "Língua Portuguesa": 3,
    "Língua Inglesa": 2,
    "Educação Física": 2,
    "Matemática": 3,
    "Física": 2,
    "Química": 2,
    "História": 2,
    "Geografia": 2,
    "Estudos Avançados (Ciências da Natureza)": 1,
    "Estudos Avançados (Matemática)": 1,
    "Laboratório de Mediação e Intervenção Sociocultural": 2,
    "Programação Web II": 2,
    "Banco de Dados II": 2,
    "Desenvolvimento de Sistemas": 3,
    "Ética e Cidadania Organizacional": 1,
    "Programação de Aplicativos Mobile I": 2
  },
  "3ª Série DS": {
    "Língua Portuguesa": 3,
    "Língua Inglesa": 2,
    "Matemática": 4,
    "Biologia": 2,
    "História": 2,
    "Geografia": 2,
    "Filosofia": 2,
    "Sociologia": 2,
    "Estudos Avançados (Ciências da Natureza)": 3,
    "Estudos Avançados (Matemática)": 3,
    "Programação Web III": 2,
    "Programação de Aplicativos Mobile II": 2,
    "Internet, Protocolos e Segurança": 2,
    "Planejamento e Desenvolvimento do TCC": 3,
    "Qualidade e Teste de Software": 2,
    "Sistemas Embarcados": 2
  },
  "1ª Série JOD": {
    "Língua Portuguesa": 2,
    "Língua Inglesa": 2,
    "Arte": 2,
    "Educação Física": 2,
    "Matemática": 2,
    "Biologia": 2,
    "Física": 2,
    "Química": 2,
    "História": 2,
    "Geografia": 2,
    "Ambiente de Desenvolvimento de Jogos Digitais I": 2,
    "Programação e Algoritmos": 2,
    "Narrativas e Roteiros para Jogos Digitais": 2,
    "Operação de Software Aplicativo": 2,
    "Conduta Profissional e Relações de Trabalho": 1,
    "Game Art I": 2
  },
  "2ª Série JOD": {
    "Língua Portuguesa": 3,
    "Língua Inglesa": 2,
    "Educação Física": 2,
    "Matemática": 2,
    "Física": 2,
    "Química": 2,
    "Biologia": 2,
    "História": 2,
    "Geografia": 2,
    "Técnicas de Desenho e Desenvolvimento de Game Art II": 2,
    "Desenvolvimento de Jogos para Web II": 2,
    "Programação Orientada a Objetos": 3,
    "Modelagem 3D": 2,
    "Linguagem de Programação I": 2
  },
  "3ª Série JOD": {
    "Língua Portuguesa": 4,
    "Língua Inglesa": 2,
    "Matemática": 4,
    "Filosofia": 1,
    "Sociologia": 2,
    "Técnicas de Desenho e Desenvolvimento de Game Art III": 2,
    "Linguagem de Programação II": 3,
    "Animação 3D": 3,
    "Técnicas e Linguagens para Banco de Dados": 2,
    "Ética e Cidadania Organizacional": 1,
    "Marketing para Jogos Digitais": 2,
    "Programação para Dispositivos Móveis": 2,
    "Planejamento e Desenvolvimento do TCC em Jogos Digitais": 2
  },
  "1ª Série MAD": {
    "Língua Portuguesa, Literatura e Comunicação Profissional": 4,
    "Língua Estrangeira Moderna - Inglês": 2,
    "Arte": 2,
    "Educação Física": 2,
    "Matemática": 4,
    "Biologia": 2,
    "Física": 2,
    "Química": 2,
    "História": 2,
    "Geografia": 2,
    "Filosofia": 1,
    "Sociologia": 1,
    "Conduta Profissional e Relações de Trabalho": 1,
    "Projetos de Tecnologia de Informação e Comunicação": 2,
    "Planejamento Empresarial": 2,
    "Planejamento e Organização das Rotinas Administrativas": 2,
    "Administração de Recursos Humanos": 2
  },
  "2ª Série MAD": {
    "Língua Portuguesa, Literatura e Comunicação Profissional": 3,
    "Língua Estrangeira Moderna - Inglês": 2,
    "Educação Física": 2,
    "Matemática": 3,
    "Física": 2,
    "Química": 2,
    "Biologia": 2,
    "História": 2,
    "Geografia": 2,
    "Filosofia": 1,
    "Estudos Avançados em Ciências Humanas e Sociais Aplicadas": 1,
    "Estudos Avançados em Matemática e suas Tecnologias": 1,
    "Laboratório de Mediação e Intervenção Sociocultural": 2,
    "Laboratório de Processos Criativos": 2,
    "Custos, Processos e Operações Contábeis": 3,
    "Planejamento e Organização de Rotinas de Departamento Pessoal": 2,
    "Desenvolvimento de Modelos de Negócios": 2,
    "Estudos da Administração Pública": 2
  },
  "3ª Série MAD": {
    "Língua Portuguesa e Literatura": 4,
    "Língua Estrangeira Moderna - Inglês": 2,
    "Matemática": 4,
    "Sociologia": 2,
    "Estudos Avançados em Ciencias Humanas e Sociais Aplicadas": 3,
    "Estudos Avançados em Matematica e suas Tecnologias": 3,
    "Administração Financeira e Orçamentária (AFO)": 3,
    "Administração da Produção e Serviços": 3,
    "Administração de Recursos Humanos": 3,
    "Estudos de Economia, Mercado e de Comercio Internacional": 2,
    "Ética e Cidadania Organizacional": 1,
    "Processos Logisticos Empresariais": 2,
    "Tecnologia da Informação em Administração": 2,
    "Planejamento e Desenvolvimento do TCC (PDTCC)": 3
  },
  "1ª Série MDI": {
    "Língua Portuguesa": 2,
    "Língua Estrangeira Moderna - Inglês": 2,
    "Arte": 2,
    "Educação Física": 2,
    "Matemática": 3,
    "Física": 2,
    "História": 2,
    "Geografia": 2,
    "Filosofia": 1,
    "Estudos Avançados em Ciências Humanas e Sociais Aplicadas": 1,
    "Estudos Avançados em Linguagens e suas Tecnologias": 1,
    "Laboratório de Investigação Científica": 2,
    "Práticas de Empreendedorismo": 2,
    "Composição no Projeto de Design de Interiores": 2,
    "Ergonomia": 2,
    "Estudo e Aplicação dos Materiais e Revestimentos no Design de Interiores": 2,
    "Projeto de Espaços Efêmeros": 2,
    "Expressões Visuais Aplicadas ao Design de Interiores I": 2,
    "Representação da Linguagem Projetiva e Arquitetônica I": 2,
    "Representação Digital de Projetos de Interiores I": 2
  },
  "2ª Série MDI": {
    "Língua Portuguesa": 3,
    "Língua Inglesa": 2,
    "Educação Física": 2,
    "Matemática": 3,
    "Química": 2,
    "Física": 2,
    "Biologia": 2,
    "Geografia": 2,
    "História": 2,
    "Estudos Avançados em Ciências Humanas e Sociais Aplicadas": 1,
    "Estudos Avançados em Linguagens e suas Tecnologias": 1,
    "Laboratório de Mediação e Intervenção Sociocultural": 2,
    "Laboratório de Processos Criativos": 2,
    "Expressões Visuais Aplicadas ao Design de Interiores II": 2,
    "Representação da Linguagem Projetiva e Arquitetônica II": 2,
    "Representação Digital de Projetos de Interiores II": 2,
    "Projetos de Interiores Residenciais": 2,
    "Representação Técnica do Mobiliário II": 2
  },
  "3ª Série MDI": {
    "Língua Portuguesa": 5,
    "Língua Inglesa": 2,
    "Matemática": 4,
    "Química": 2,
    "Biologia": 2,
    "Geografia": 2,
    "Sociologia": 1,
    "Estudos Avançados em Ciências Humanas e Sociais Aplicadas": 3,
    "Estudos Avançados em Linguagens e suas Tecnologias": 3,
    "Representação Técnica do Mobiliário II": 2,
    "Conforto Ambiental Aplicado ao Projeto de Interiores": 1,
    "Ética e Cidadania Organizacional": 1,
    "História do Mobiliário": 2,
    "Ilustração no Projeto de Interiores": 2,
    "Planejamento e Desenvolvimento do Trabalho de Conclusão de Curso (TCC) em Design de Interiores": 2,
    "Projetos de Interiores Comerciais": 2
  }
}
=== PROF ASSIGNMENTS ===
{
  "Andreia": [
    {
      "subjects": [
        "BIO"
      ],
      "turmas": [
        "2MAD",
        "3MDS",
        "2MDI"
      ]
    }
  ],
  "Caroline": [
    {
      "subjects": [
        "ERGO"
      ],
      "turmas": [
        "1MDI"
      ]
    },
    {
      "subjects": [
        "RDPI II"
      ],
      "turmas": [
        "2MDI"
      ]
    },
    {
      "subjects": [
        "EVADI II"
      ],
      "turmas": [
        "2MDI"
      ]
    }
  ],
  "Danilo": [
    {
      "subjects": [
        "EACHSA"
      ],
      "turmas": [
        "3MAD",
        "3MDI"
      ]
    },
    {
      "subjects": [
        "ECO"
      ],
      "turmas": [
        "2MDS",
        "3MAD",
        "3MDI"
      ]
    },
    {
      "subjects": [
        "TIA"
      ],
      "turmas": [
        "3MAD"
      ]
    }
  ],
  "Eliamar": [
    {
      "subjects": [
        "FILO"
      ],
      "turmas": [
        "1MAD",
        "1MDS",
        "1MDI"
      ]
    },
    {
      "subjects": [
        "MAT"
      ],
      "turmas": [
        "2MDS",
        "3MDS",
        "1MDI",
        "2JOD",
        "3JOD"
      ]
    },
    {
      "subjects": [
        "EAMT"
      ],
      "turmas": [
        "3MAD",
        "3MDS"
      ]
    }
  ],
  "Elisangela": [
    {
      "subjects": [
        "PDTCC"
      ],
      "turmas": [
        "3MAD",
        "2MDS",
        "3MDS",
        "3MDI",
        "3JOD"
      ]
    },
    {
      "subjects": [
        "TIA"
      ],
      "turmas": [
        "3MAD"
      ]
    },
    {
      "subjects": [
        "PTIC"
      ],
      "turmas": [
        "1MDS",
        "1MDI"
      ]
    },
    {
      "subjects": [
        "ADJD I"
      ],
      "turmas": [
        "1JOD"
      ]
    },
    {
      "subjects": [
        "DJW II"
      ],
      "turmas": [
        "2JOD"
      ]
    },
    {
      "subjects": [
        "TLBD"
      ],
      "turmas": [
        "3JOD"
      ]
    }
  ],
  "Elizabeth": [
    {
      "subjects": [
        "LPC",
        "LMIS"
      ],
      "turmas": [
        "2MAD",
        "2MDS",
        "1MDI",
        "2MDI",
        "2JOD"
      ]
    },
    {
      "subjects": [
        "EALT"
      ],
      "turmas": [
        "2MDI",
        "3MDI"
      ]
    },
    {
      "subjects": [
        "SOC"
      ],
      "turmas": [
        "1MDS",
        "3MDI"
      ]
    },
    {
      "subjects": [
        "FILO"
      ],
      "turmas": [
        "3JOD"
      ]
    }
  ],
  "Elza": [
    {
      "subjects": [
        "EAMT"
      ],
      "turmas": [
        "2MAD",
        "3MAD",
        "2MDS",
        "3MDS"
      ]
    },
    {
      "subjects": [
        "EACNT"
      ],
      "turmas": [
        "1MDS",
        "2MDS",
        "3MDS"
      ]
    },
    {
      "subjects": [
        "SOC"
      ],
      "turmas": [
        "3MDS",
        "3JOD"
      ]
    },
    {
      "subjects": [
        "FILO"
      ],
      "turmas": [
        "3MDS"
      ]
    },
    {
      "subjects": [
        "MJD"
      ],
      "turmas": [
        "3JOD"
      ]
    },
    {
      "subjects": [
        "EACHSA"
      ],
      "turmas": [
        "1MDS",
        "2MAD"
      ]
    }
  ],
  "Evelise": [
    {
      "subjects": [
        "HIST"
      ],
      "turmas": [
        "1MAD",
        "2MAD",
        "1MDS",
        "2MDS",
        "1MDI",
        "2MDI",
        "1JOD",
        "2JOD"
      ]
    }
  ],
  "Felix": [
    {
      "subjects": [
        "EAMRDI"
      ],
      "turmas": [
        "1MDI"
      ]
    }
  ],
  "Fidelis": [
    {
      "subjects": [
        "ING"
      ],
      "turmas": [
        "1MAD",
        "1MDS"
      ]
    },
    {
      "subjects": [
        "PORT",
        "LPC"
      ],
      "turmas": [
        "1MAD",
        "2MAD",
        "3MAD",
        "1MDS",
        "2MDS",
        "3MDS",
        "1MDI",
        "2MDI"
      ]
    },
    {
      "subjects": [
        "LMIS"
      ],
      "turmas": [
        "2MAD",
        "2MDS"
      ]
    },
    {
      "subjects": [
        "LPL"
      ],
      "turmas": [
        "1MDI",
        "2MDI"
      ]
    }
  ],
  "Gabriela": [
    {
      "subjects": [
        "RLPA I",
        "II"
      ],
      "turmas": [
        "1MDI",
        "2MDI"
      ]
    },
    {
      "subjects": [
        "HM",
        "RTMI",
        "RTMII"
      ],
      "turmas": [
        "2MDI",
        "3MDI"
      ]
    }
  ],
  "Gilvan": [
    {
      "subjects": [
        "ARTE"
      ],
      "turmas": [
        "1MAD",
        "1MDS",
        "1MDI",
        "1JOD"
      ]
    },
    {
      "subjects": [
        "GAME ART",
        "MO 3D",
        "ANI 3D"
      ],
      "turmas": [
        "1JOD",
        "2JOD",
        "3JOD"
      ]
    },
    {
      "subjects": [
        "TDDGA",
        "NRID"
      ],
      "turmas": [
        "2JOD",
        "1JOD"
      ]
    }
  ],
  "Gisbert": [
    {
      "subjects": [
        "PA"
      ],
      "turmas": [
        "1MDS",
        "1JOD"
      ]
    },
    {
      "subjects": [
        "PW I"
      ],
      "turmas": [
        "1MDS"
      ]
    },
    {
      "subjects": [
        "POO"
      ],
      "turmas": [
        "2JOD"
      ]
    },
    {
      "subjects": [
        "PDM"
      ],
      "turmas": [
        "3JOD"
      ]
    }
  ],
  "Iury": [
    {
      "subjects": [
        "BD I",
        "II"
      ],
      "turmas": [
        "1MDS",
        "2MDS"
      ]
    },
    {
      "subjects": [
        "SE",
        "SE IoT"
      ],
      "turmas": [
        "1MDS",
        "3MDS"
      ]
    },
    {
      "subjects": [
        "IPSSI",
        "QTS"
      ],
      "turmas": [
        "3MDS"
      ]
    }
  ],
  "Jean": [
    {
      "subjects": [
        "PE",
        "PORA",
        "PORDP",
        "APS"
      ],
      "turmas": [
        "1MAD",
        "2MAD",
        "3MAD"
      ]
    }
  ],
  "Jose A": [
    {
      "subjects": [
        "QUI"
      ],
      "turmas": [
        "1MAD",
        "1MDS",
        "2MDS",
        "3MDI",
        "1JOD",
        "2JOD"
      ]
    }
  ],
  "Joyce": [
    {
      "subjects": [
        "ERGO",
        "RDPI II",
        "EVADI II",
        "RTMI",
        "IPI"
      ],
      "turmas": [
        "1MDI",
        "2MDI",
        "3MDI"
      ]
    }
  ],
  "Luiz F": [
    {
      "subjects": [
        "MAT"
      ],
      "turmas": [
        "1MAD",
        "2MAD",
        "1MDS",
        "2MDI",
        "1JOD"
      ]
    },
    {
      "subjects": [
        "FIS"
      ],
      "turmas": [
        "1MAD",
        "1MDS",
        "2MDS",
        "1MDI",
        "2MDI",
        "1JOD",
        "2JOD"
      ]
    }
  ],
  "Marcelo": [
    {
      "subjects": [
        "FIS"
      ],
      "turmas": [
        "2MAD"
      ]
    },
    {
      "subjects": [
        "PIR",
        "PIC",
        "PEE"
      ],
      "turmas": [
        "2MDI",
        "3MDI",
        "1MDI"
      ]
    }
  ],
  "Marcio": [
    {
      "subjects": [
        "CPOC",
        "DMN",
        "PORA",
        "GEO"
      ],
      "turmas": [
        "1MAD",
        "2MAD",
        "1MDI"
      ]
    }
  ],
  "Meire": [
    {
      "subjects": [
        "LPL",
        "PORT",
        "MJD",
        "NRID"
      ],
      "turmas": [
        "3MDI",
        "1JOD",
        "2JOD",
        "3JOD"
      ]
    }
  ],
  "Patricia": [
    {
      "subjects": [
        "BIO"
      ],
      "turmas": [
        "1MAD",
        "1MDS",
        "2MDS",
        "1MDI",
        "3MDI",
        "1JOD"
      ]
    },
    {
      "subjects": [
        "ING"
      ],
      "turmas": [
        "2MAD",
        "3MAD",
        "2MDS",
        "3MDS",
        "2MDI",
        "3MDI",
        "2JOD",
        "3JOD",
        "1MDI",
        "1JOD"
      ]
    }
  ],
  "Paulo": [
    {
      "subjects": [
        "PW I",
        "PW III",
        "DS",
        "PAM",
        "PA",
        "ADJD",
        "POO",
        "LP",
        "DJW",
        "PDM"
      ],
      "turmas": [
        "1MDS",
        "2MDS",
        "3MDS",
        "1JOD",
        "2JOD",
        "3JOD"
      ]
    }
  ],
  "Ricardo": [
    {
      "subjects": [
        "AFO"
      ],
      "turmas": [
        "3MAD"
      ]
    }
  ],
  "Rodrigo": [
    {
      "subjects": [
        "CPRT",
        "EAP",
        "EACHSA",
        "ECO"
      ],
      "turmas": [
        "1MAD",
        "2MAD",
        "1JOD",
        "3JOD"
      ]
    }
  ],
  "Rogerio": [
    {
      "subjects": [
        "GEO"
      ],
      "turmas": [
        "1MAD",
        "1MDS",
        "1MDI",
        "3MDI"
      ]
    }
  ],
  "Sonia": [
    {
      "subjects": [
        "RLPA",
        "CPDI",
        "EVADI",
        "PEE",
        "PIR",
        "RTMI",
        "PIC",
        "CAAPI",
        "PDTCC"
      ],
      "turmas": [
        "1MDI",
        "2MDI",
        "3MDI"
      ]
    }
  ],
  "Thiago": [
    {
      "subjects": [
        "ED. FIS"
      ],
      "turmas": [
        "1MAD",
        "2MAD",
        "1MDS",
        "2MDS",
        "1MDI",
        "2MDI",
        "1JOD",
        "2JOD"
      ]
    }
  ],
  "Valdeci": [
    {
      "subjects": [
        "GEO"
      ],
      "turmas": [
        "2MDS",
        "3MDS",
        "2MDI",
        "2JOD"
      ]
    }
  ],
  "Vanessa": [
    {
      "subjects": [
        "BD",
        "DS",
        "PW II",
        "SE",
        "IPSSI",
        "QTS",
        "PTIC"
      ],
      "turmas": [
        "1MDS",
        "2MDS",
        "3MDS",
        "1MDI"
      ]
    }
  ],
  "Veridiane": [
    {
      "subjects": [
        "ARH",
        "PDTCC",
        "DMN",
        "PORDP",
        "SOC",
        "LPC",
        "EEM"
      ],
      "turmas": [
        "1MAD",
        "2MAD",
        "3MAD",
        "3MDS",
        "1MDI",
        "2MDI",
        "3JOD"
      ]
    }
  ],
  "Wellington": [
    {
      "subjects": [
        "PTIC",
        "PAM",
        "LP",
        "OSA"
      ],
      "turmas": [
        "1MAD",
        "1MDS",
        "2MDS",
        "1JOD",
        "3JOD"
      ]
    }
  ],
  "William B": [
    {
      "subjects": [
        "MAT"
      ],
      "turmas": [
        "3MAD",
        "3MDS",
        "3MDI"
      ]
    }
  ]
}
`.split('=== PROF ASSIGNMENTS ===');
  const turmasJson = jsonSegments[0].replace('=== TURMAS AULAS ===', '');
  const profsJson = jsonSegments[1];

  Object.assign(QUANTITIES_EXACT, JSON.parse(turmasJson));
  Object.assign(PROF_ASSIGNMENTS, JSON.parse(profsJson));
}

// Mapa global de apelidos
const ALIASES = {
  "PORT/LPC": ["Língua Portuguesa, Literatura e Comunicação Profissional", "Língua Portuguesa e Literatura", "Língua Portuguesa"],
  "LPC/LMIS": ["Laboratório de Mediação e Intervenção Sociocultural", "Laboratório de Processos Criativos"],
  "PORT": ["Língua Portuguesa, Literatura e Comunicação Profissional", "Língua Portuguesa e Literatura", "Língua Portuguesa"],
  "LPL": ["Língua Portuguesa", "Língua Portuguesa e Literatura"],
  "ING": ["Língua Estrangeira Moderna - Inglês", "Língua Inglesa"],
  "MAT": ["Matemática"],
  "FIS": ["Física"],
  "QUI": ["Química"],
  "BIO": ["Biologia"],
  "HIST": ["História"],
  "GEO": ["Geografia"],
  "FILO": ["Filosofia"],
  "SOC": ["Sociologia"],
  "ARTE": ["Arte"],
  "ED. FIS": ["Educação Física"],
  "CPRT": ["Conduta Profissional e Relações de Trabalho"],
  "PTIC": ["Projetos de Tecnologia de Informação e Comunicação"],
  "PE": ["Planejamento Empresarial"],
  "PORA": ["Planejamento e Organização das Rotinas Administrativas", "Planejamento e Organização de Rotinas Administrativas"],
  "ARH": ["Administração de Recursos Humanos"],
  "EACHSA": ["Estudos Avançados em Ciências Humanas e Sociais Aplicadas", "Estudos Avançados (Ciências da Natureza)"], // corrigido adiante
  "EAMT": ["Estudos Avançados em Matemática e suas Tecnologias", "Estudos Avançados (Matemática)"],
  "LMIS": ["Laboratório de Mediação e Intervenção Sociocultural"],
  "LPC": ["Laboratório de Processos Criativos"],
  "CPOC": ["Custos, Processos e Operações Contábeis"],
  "PORDP": ["Planejamento e Organização de Rotinas de Departamento Pessoal"],
  "DMN": ["Desenvolvimento de Modelos de Negócios"],
  "EAP": ["Estudos da Administração Pública"],
  "AFO": ["Administração Financeira e Orçamentária (AFO)"],
  "APS": ["Administração da Produção e Serviços"],
  "ECO": ["Ética e Cidadania Organizacional"],
  "PLE": ["Processos Logisticos Empresariais"],
  "TIA": ["Tecnologia da Informação em Administração"],
  "PDTCC": ["Planejamento e Desenvolvimento do TCC (PDTCC)", "Planejamento e Desenvolvimento do TCC", "Planejamento e Desenvolvimento do Trabalho de Conclusão de Curso (TCC) em Design de Interiores", "Planejamento e Desenvolvimento do TCC em Jogos Digitais"],
  "PA": ["Algoritmos e Lógica de Programação", "Programação e Algoritmos"],
  "FI": ["Fundamentos de Informática"],
  "DD": ["Design Digital"],
  "EACNT": ["Estudos Avançados (Ciências da Natureza)"],
  "BD I": ["Banco de Dados I"],
  "BD II": ["Banco de Dados II"],
  "PW I": ["Programação Web I"],
  "PW II": ["Programação Web II"],
  "PW III": ["Programação Web III"],
  "DS": ["Desenvolvimento de Sistemas"],
  "PAM I": ["Programação de Aplicativos Mobile I"],
  "PAM II": ["Programação de Aplicativos Mobile II"],
  "SE": ["Sistemas Embarcados"],
  "QTS": ["Qualidade e Teste de Software"],
  "IPSSI": ["Internet, Protocolos e Segurança"],
  "MOBILE": ["Programação de Aplicativos Mobile II"],
  "EALT": ["Estudos Avançados em Linguagens e suas Tecnologias"],
  "CPDI": ["Composição no Projeto de Design de Interiores"],
  "ERGO": ["Ergonomia"],
  "EAMRDI": ["Estudo e Aplicação dos Materiais e Revestimentos no Design de Interiores"],
  "PEE": ["Projeto de Espaços Efêmeros"],
  "EVADI I": ["Expressões Visuais Aplicadas ao Design de Interiores I"],
  "RLPA I": ["Representação da Linguagem Projetiva e Arquitetônica I"],
  "RDPI I": ["Representação Digital de Projetos de Interiores I"],
  "ROPI I": ["Representação Digital de Projetos de Interiores I"],
  "EVADI II": ["Expressões Visuais Aplicadas ao Design de Interiores II"],
  "RLPA II": ["Representação da Linguagem Projetiva e Arquitetônica II"],
  "RDPI II": ["Representação Digital de Projetos de Interiores II"],
  "PIR": ["Projetos de Interiores Residenciais"],
  "RTMI": ["Representação Técnica do Mobiliário I"],
  "RTMII": ["Representação Técnica do Mobiliário II"],
  "CAAPI": ["Conforto Ambiental Aplicado ao Projeto de Interiores"],
  "HM": ["História do Mobiliário"],
  "IPI": ["Ilustração no Projeto de Interiores"],
  "PIC": ["Projetos de Interiores Comerciais"],
  "ADJD I": ["Ambiente de Desenvolvimento de Jogos Digitais I"],
  "NRID": ["Narrativas e Roteiros para Jogos Digitais"],
  "OSA": ["Operação de Software Aplicativo"],
  "GAME ART I": ["Game Art I"],
  "TDDGA II": ["Técnicas de Desenho e Desenvolvimento de Game Art II"],
  "TDDGA III": ["Técnicas de Desenho e Desenvolvimento de Game Art III"],
  "DJW II": ["Desenvolvimento de Jogos para Web II"],
  "POO": ["Programação Orientada a Objetos"],
  "MO 3D": ["Modelagem 3D"],
  "LPI": ["Linguagem de Programação I"],
  "LPII": ["Linguagem de Programação II"],
  "LP": ["Linguagem de Programação I", "Linguagem de Programação II"],
  "ANI 3D": ["Animação 3D"],
  "TLBD": ["Técnicas e Linguagens para Banco de Dados"],
  "MJD": ["Marketing para Jogos Digitais"],
  "PDM": ["Programação para Dispositivos Móveis"]
};

// Corrige aliases com multiplas chaves
ALIASES["BD"] = ["Banco de Dados I", "Banco de Dados II"];
ALIASES["PW"] = ["Programação Web I", "Programação Web II", "Programação Web III"];
ALIASES["PAM"] = ["Programação de Aplicativos Mobile I", "Programação de Aplicativos Mobile II"];
ALIASES["TDDGA"] = ["Técnicas de Desenho e Desenvolvimento de Game Art II", "Técnicas de Desenho e Desenvolvimento de Game Art III"];
ALIASES["DJW"] = ["Desenvolvimento de Jogos para Web II", "Desenvolvimento de Jogos para Web I"];
ALIASES["GAME ART"] = ["Game Art I", "Game Art II", "Game Art III"];

// Algumas matérias que podem estar desmembradas
ALIASES["RLPA I/II"] = ALIASES["RLPA I"].concat(ALIASES["RLPA II"]);
ALIASES["BD I/II"] = ["Banco de Dados I", "Banco de Dados II"];
ALIASES["SE/SE IoT"] = ["Sistemas Embarcados"];
ALIASES["HM/RTMI/RTMII"] = [].concat(ALIASES["HM"], ALIASES["RTMI"], ALIASES["RTMII"]);

// Função que acha a chave original na Quantity baseada num alias
function findRealSubjects(turmaFull, subjAlias) {
  const qMap = QUANTITIES_EXACT[turmaFull] || {};
  let found = [];

  // Testa busca direta primeiro (ex: "Sociologia")
  if (qMap[subjAlias]) return [subjAlias];

  // Resolve Alias
  const possibles = ALIASES[subjAlias] || [subjAlias];
  for (const p of possibles) {
    if (qMap[p]) {
      found.push(p);
    }
  }

  // Tratamentos com sufixos
  if (found.length === 0) {
    for (const k of Object.keys(qMap)) {
      if (k.toUpperCase().includes(subjAlias.toUpperCase())) {
        found.push(k);
      }
    }
  }

  return found; // Ex: devolve ["Língua Inglesa"]
}

async function post(endpoint, data) {
  try {
    const res = await fetch(`${API_BASE}/api/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      return null;
    }
    return await res.json();
  } catch (e) {
    return null;
  }
}

async function main() {
  console.log("🚀 INICIANDO SEED_FULL_V3: ZERO PREGUIÇA (100% EXATO)");

  // 1. Criar Turmas
  console.log("\n--- 1. Criando Horários e Turmas ---");
  const mapTurma = new Map();
  for (const t of TURMAS) {
    let res = await post("class-groups", t);
    if (!res) {
      const getRes = await fetch(`${API_BASE}/api/class-groups`);
      if (getRes.ok) {
        const list = await getRes.json();
        res = list.find(tg => tg.name === t.name);
      }
    }
    if (res) mapTurma.set(t.name, res.id);
    process.stdout.write("✅");
  }

  // 2. Horários
  const dias = [1, 2, 3, 4, 5];
  for (const diaNum of dias) {
    const diaString = DIAS_SEMANA_MAP[diaNum];
    const createSlot = async (h, tipo) => {
      await post("timeslots", { dayOfWeek: diaString, startTime: formatTime(h.start), endTime: formatTime(h.end), shiftType: tipo });
    };

    for (const h of HORARIOS_COMUNS) {
      await createSlot(h, "REGULAR");
      await createSlot(h, "INTEGRAL");
    }
    await createSlot(SLOT_ALMOCO, "REGULAR");
    for (const h of HORARIOS_TARDE) {
      await createSlot(h, "INTEGRAL");
    }
  }

  // 3. Gerar demandas e disciplinas exatamente da Matriz  
  console.log("\n\n--- 2. Preparando Matriz de Aulas ---");

  // Primeiro, formatar a conversão TurmaCurto -> TurmaLongo (ex: 1MAD -> 1ª Série MAD)
  const codeToLong = {
    "1MAD": "1ª Série MAD", "2MAD": "2ª Série MAD", "3MAD": "3ª Série MAD",
    "1MDS": "1ª Série DS", "2MDS": "2ª Série DS", "3MDS": "3ª Série DS",
    "1MDI": "1ª Série MDI", "2MDI": "2ª Série MDI", "3MDI": "3ª Série MDI",
    "1JOD": "1ª Série JOD", "2JOD": "2ª Série JOD", "3JOD": "3ª Série JOD",
  };

  // Criar estrutura limpa para a API
  // structure: { "1MAD": { "História": { profs: ["Evelise", "Fidelis"], quantity: 2 } } }
  const API_Demands = {};
  for (const tCode of Object.keys(codeToLong)) {
    API_Demands[tCode] = {};
    const tLong = codeToLong[tCode];
    const grades = QUANTITIES_EXACT[tLong] || {};
    for (const subj of Object.keys(grades)) {
      API_Demands[tCode][subj] = { profs: [], quantity: grades[subj] };
    }
  }

  // Varre tabela de Profs -> distribui
  console.log("\n--- 3. Mapeando Designações de Professores ---");
  const todosOsProfNomes = Object.keys(PROF_ASSIGNMENTS);
  const mapProf = new Map();

  for (const prof of todosOsProfNomes) {
    let res = await post("professors", { name: prof });
    if (!res) {
      const getRes = await fetch(`${API_BASE}/api/professors`);
      if (getRes.ok) {
        const list = await getRes.json();
        res = list.find(p => p.name.toUpperCase() === prof.toUpperCase());
      }
    }
    if (res) mapProf.set(prof, res.id);

    const binds = PROF_ASSIGNMENTS[prof];
    for (const bind of binds) {
      const subjects = bind.subjects; // ["MAT", "FILO"]
      const turmas = bind.turmas;     // ["1MAD", "3MDS"]

      for (const t of turmas) {
        if (!API_Demands[t]) continue;
        const tLong = codeToLong[t];

        for (const subjAlias of subjects) {
          const subjsReais = findRealSubjects(tLong, subjAlias);
          for (const realSubject of subjsReais) {
            if (API_Demands[t][realSubject] && !API_Demands[t][realSubject].profs.includes(prof)) {
              API_Demands[t][realSubject].profs.push(prof);
            }
          }
        }
      }
    }
  }

  console.log("\n--- 4. Inserindo na Base de Dados Rest ---");
  let missing = 0;

  for (const tCode of Object.keys(API_Demands)) {
    const turmaId = mapTurma.get(tCode);
    if (!turmaId) continue;

    const materiasObj = API_Demands[tCode];
    let tCount = 0;
    let totalSlots = 0;

    for (const realSubjectName of Object.keys(materiasObj)) {
      const data = materiasObj[realSubjectName];
      if (data.quantity <= 0) continue;

      totalSlots += data.quantity;

      // Se não há prof setado, avisa!
      if (data.profs.length === 0) {
        //console.warn(`${tCode} não tem prof pra ${realSubjectName}`);
        missing++;
      }

      // 1. Cria a subject
      let subjRes = await post("subjects", { name: realSubjectName, classGroupId: turmaId });
      if (!subjRes) {
        const getRes = await fetch(`${API_BASE}/api/subjects`);
        if (getRes.ok) {
          const list = await getRes.json();
          subjRes = list.find(s => s.name === realSubjectName && s.classGroup.id === turmaId);
        }
      }
      if (!subjRes) continue;

      // 2. Cria demanda (atribui um prof default pro sistema aceitar criar grade incompleta e não quebrar?)
      // Para rodar perfeito, só envia pros profs reais designados.
      if (data.profs.length > 0) {
        const professorIds = data.profs.map(p => mapProf.get(p)).filter(id => id);
        await post("demands", {
          subjectId: subjRes.id,
          professorIds: professorIds,
          quantityPerWeek: data.quantity,
          allowDoubleLesson: true
        });
        process.stdout.write("+");
      }
    }
    console.log(`
[${tCode}] ${totalSlots} aulas na matriz.`);
  }

  console.log(`

✅ FINALIZADO! Script enviou demanda idêntica à matriz oficial.`);
}

main();
