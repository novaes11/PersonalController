const packageJson = require('../../package.json');

/**
 * Gera a especificação OpenAPI 3.0.3 oficial do PersonalController.
 * Todos os schemas de mutação mantêm `additionalProperties: false` espelhando
 * as regras `.strict()` do Zod contra Mass Assignment (AppSec SEC-04).
 *
 * @returns {object} Especificação OpenAPI 3.0.3
 */
function buildOpenApiSpec() {
  const errorResponseRef = { $ref: '#/components/schemas/ErrorResponse' };
  const rateLimitResponseRef = { $ref: '#/components/schemas/RateLimitErrorResponse' };

  const commonAuthErrors = {
    401: {
      description: 'Token Bearer ausente, inválido ou expirado.',
      content: { 'application/json': { schema: errorResponseRef } }
    },
    429: {
      description: 'Limite de requisições excedido (SEC-05 Rate Limiting).',
      content: { 'application/json': { schema: rateLimitResponseRef } }
    },
    500: {
      description: 'Erro interno inesperado no servidor.',
      content: { 'application/json': { schema: errorResponseRef } }
    }
  };

  return {
    openapi: '3.0.3',
    info: {
      title: 'PersonalController API',
      version: packageJson.version || '1.0.0',
      description:
        'Documentação OpenAPI 3.0 interativa da API REST do PersonalController (Autenticação Supabase/Dev Fallback, Categorias, Transações, Extração & Lote PDF, Portfólio Consolidado e Worker de Cotações). ' +
        'Todos os endpoints de mutação utilizam validação estrita SEC-04 contra Mass Assignment.'
    },
    servers: [
      {
        url: '/api',
        description: 'PersonalController API (prefixo padrão /api — local e Vercel)'
      },
      {
        url: '/',
        description: 'PersonalController API (roteamento direto na raiz)'
      }
    ],
    tags: [
      { name: 'System & Health', description: 'Diagnóstico e disponibilidade do serviço' },
      { name: 'Auth', description: 'Cadastro, login, sessão e perfil autenticado' },
      { name: 'Categories', description: 'Gestão multi-tenant de categorias (sistema + usuário)' },
      { name: 'Transactions', description: 'Lançamentos financeiros, parser de PDF e importação em lote' },
      { name: 'Portfolio', description: 'Consolidação de carteira e alocação de ativos' },
      { name: 'Cron & Workers', description: 'Workers agendados para atualização de cotações' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Informe apenas o JWT obtido em POST /auth/login ou POST /auth/signup.'
        },
        cronAuth: {
          type: 'http',
          scheme: 'bearer',
          description: 'Segredo CRON_SECRET utilizado para disparo autorizado do job /cron/quotes.'
        }
      },
      schemas: {
        ValidationIssue: {
          type: 'object',
          properties: {
            field: { type: 'string', example: 'amount' },
            message: { type: 'string', example: 'O valor da transação deve ser positivo e maior que zero' }
          }
        },
        ErrorResponse: {
          type: 'object',
          required: ['status', 'message'],
          properties: {
            status: { type: 'string', enum: ['error'], example: 'error' },
            message: { type: 'string', example: 'Dados inválidos para a operação solicitada' },
            errors: {
              type: 'array',
              items: { $ref: '#/components/schemas/ValidationIssue' }
            }
          }
        },
        RateLimitErrorResponse: {
          type: 'object',
          required: ['status', 'code', 'message'],
          properties: {
            status: { type: 'string', enum: ['error'], example: 'error' },
            code: { type: 'string', example: 'RATE_LIMIT_EXCEEDED' },
            message: { type: 'string', example: 'Limite de requisições da API excedido. Tente novamente em instantes.' },
            retry_after_seconds: { type: 'integer', example: 60 }
          }
        },
        SignupRequest: {
          type: 'object',
          additionalProperties: false,
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'usuario@personalcontroller.app' },
            password: {
              type: 'string',
              minLength: 6,
              format: 'password',
              description: 'Mínimo de 6 caracteres no backend (a interface recomenda 8+ com maiúscula, minúscula, número e símbolo).',
              example: 'Senha@123'
            }
          }
        },
        LoginRequest: {
          type: 'object',
          additionalProperties: false,
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'demo@personalcontroller.app' },
            password: {
              type: 'string',
              minLength: 1,
              format: 'password',
              description: 'Para acessar o ambiente de demonstração, utilize as credenciais exibidas em /login.',
              example: 'Senha@123'
            }
          }
        },
        UserResponse: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: '11111111-1111-4111-8111-111111111111' },
            email: { type: 'string', format: 'email', example: 'usuario@personalcontroller.app' },
            created_at: { type: 'string', format: 'date-time', nullable: true, example: '2026-11-18T12:00:00.000Z' },
            isDemo: { type: 'boolean', example: false }
          }
        },
        SessionPayload: {
          type: 'object',
          nullable: true,
          properties: {
            access_token: { type: 'string', example: 'jwt-access-placeholder' },
            refresh_token: { type: 'string', nullable: true, example: 'jwt-refresh-placeholder' },
            expires_at: { type: 'integer', nullable: true, example: 1795200000 },
            token_type: { type: 'string', example: 'bearer' }
          }
        },
        AuthSuccessResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['ok'], example: 'ok' },
            message: { type: 'string', example: 'Autenticado com sucesso' },
            isDemo: { type: 'boolean', example: false },
            token: { type: 'string', nullable: true, example: 'jwt-access-placeholder' },
            requiresEmailConfirmation: { type: 'boolean', example: false },
            requires_email_confirmation: { type: 'boolean', example: false },
            user: { $ref: '#/components/schemas/UserResponse' },
            session: { $ref: '#/components/schemas/SessionPayload' }
          }
        },
        Category: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: '11111111-1111-4111-8111-111111111103' },
            name: { type: 'string', example: 'Alimentação' },
            type: { type: 'string', enum: ['INCOME', 'EXPENSE'], example: 'EXPENSE' },
            color: { type: 'string', nullable: true, example: '#10b981' },
            icon: { type: 'string', nullable: true, example: 'utensils' },
            user_id: { type: 'string', format: 'uuid', nullable: true, example: null },
            created_at: { type: 'string', format: 'date-time', nullable: true, example: '2026-11-01T10:00:00.000Z' }
          }
        },
        CreateCategoryRequest: {
          type: 'object',
          additionalProperties: false,
          required: ['name', 'type'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 100, example: 'Assinaturas' },
            type: { type: 'string', enum: ['INCOME', 'EXPENSE'], example: 'EXPENSE' },
            color: { type: 'string', maxLength: 20, nullable: true, example: '#6366f1' },
            icon: { type: 'string', maxLength: 50, nullable: true, example: 'repeat' }
          }
        },
        UpdateCategoryRequest: {
          type: 'object',
          additionalProperties: false,
          minProperties: 1,
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 100, example: 'Streaming & Assinaturas' },
            type: { type: 'string', enum: ['INCOME', 'EXPENSE'], example: 'EXPENSE' },
            color: { type: 'string', maxLength: 20, nullable: true, example: '#818cf8' },
            icon: { type: 'string', maxLength: 50, nullable: true, example: 'tv' }
          }
        },
        TransactionCategorySummary: {
          type: 'object',
          nullable: true,
          properties: {
            id: { type: 'string', format: 'uuid', example: '11111111-1111-4111-8111-111111111103' },
            name: { type: 'string', example: 'Alimentação' },
            type: { type: 'string', enum: ['INCOME', 'EXPENSE'], example: 'EXPENSE' },
            color: { type: 'string', nullable: true, example: '#f59e0b' },
            icon: { type: 'string', nullable: true, example: 'shopping-bag' }
          }
        },
        Transaction: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: '99999999-9999-4999-a999-999999999999' },
            user_id: { type: 'string', format: 'uuid', example: '11111111-1111-4111-8111-111111111111' },
            category_id: { type: 'string', format: 'uuid', nullable: true, example: '11111111-1111-4111-8111-111111111103' },
            amount: { type: 'number', format: 'double', example: 248.9 },
            date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$', example: '2026-11-18' },
            description: { type: 'string', nullable: true, example: 'SUPERMERCADO CENTRAL' },
            is_automated: { type: 'boolean', example: false },
            created_at: { type: 'string', format: 'date-time', nullable: true, example: '2026-11-18T14:30:00.000Z' },
            category: { $ref: '#/components/schemas/TransactionCategorySummary' }
          }
        },
        CreateTransactionRequest: {
          type: 'object',
          additionalProperties: false,
          required: ['amount'],
          properties: {
            category_id: { type: 'string', format: 'uuid', nullable: true, example: '11111111-1111-4111-8111-111111111103' },
            amount: { type: 'number', exclusiveMinimum: 0, example: 149.9 },
            date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$', example: '2026-11-18' },
            description: { type: 'string', maxLength: 255, nullable: true, example: 'Jantar em família' },
            is_automated: { type: 'boolean', default: false, example: false }
          }
        },
        UpdateTransactionRequest: {
          type: 'object',
          additionalProperties: false,
          minProperties: 1,
          properties: {
            category_id: { type: 'string', format: 'uuid', nullable: true, example: '11111111-1111-4111-8111-111111111103' },
            amount: { type: 'number', exclusiveMinimum: 0, example: 175.0 },
            date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$', example: '2026-11-18' },
            description: { type: 'string', maxLength: 255, nullable: true, example: 'Jantar atualizado' },
            is_automated: { type: 'boolean', example: false }
          }
        },
        ParsePdfRequest: {
          type: 'object',
          additionalProperties: false,
          description: 'Forneça `pdf_base64` (PDF codificado em Base64 até 5 MB) e/ou `raw_text` com linhas do extrato.',
          properties: {
            pdf_base64: { type: 'string', maxLength: 7000000, nullable: true, example: null },
            raw_text: {
              type: 'string',
              maxLength: 1000000,
              nullable: true,
              example: '07/11/2026 SUPERMERCADO CENTRAL -248,90\n10/11/2026 CREDITO SALARIO EMPRESA +8.500,00'
            },
            file_name: { type: 'string', maxLength: 120, default: 'extrato.pdf', example: 'fatura_novembro.pdf' },
            document_type: {
              type: 'string',
              enum: ['AUTO', 'BANK_STATEMENT', 'CREDIT_CARD_INVOICE'],
              default: 'AUTO',
              example: 'AUTO'
            },
            reference_year: { type: 'integer', minimum: 2000, maximum: 2100, example: 2026 }
          }
        },
        ExtractedPdfTransaction: {
          type: 'object',
          properties: {
            fingerprint: { type: 'string', example: 'a1b2c3d4e5f60718' },
            date: { type: 'string', example: '2026-11-07' },
            description: { type: 'string', example: 'SUPERMERCADO CENTRAL' },
            amount: { type: 'number', example: 248.9 },
            type: { type: 'string', enum: ['INCOME', 'EXPENSE'], example: 'EXPENSE' },
            category_id: { type: 'string', format: 'uuid', nullable: true, example: '11111111-1111-4111-8111-111111111103' },
            suggested_category_id: { type: 'string', format: 'uuid', nullable: true, example: '11111111-1111-4111-8111-111111111103' },
            suggested_category_name: { type: 'string', example: 'Alimentação' },
            confidence_score: { type: 'number', example: 0.92 },
            needs_review: { type: 'boolean', example: false },
            is_automated: { type: 'boolean', example: true }
          }
        },
        ParsePdfResponseData: {
          type: 'object',
          properties: {
            file_name: { type: 'string', example: 'fatura_novembro.pdf' },
            document_type: { type: 'string', enum: ['BANK_STATEMENT', 'CREDIT_CARD_INVOICE'], example: 'BANK_STATEMENT' },
            reference_year: { type: 'integer', example: 2026 },
            extracted_count: { type: 'integer', example: 2 },
            summary: {
              type: 'object',
              properties: {
                total_extracted: { type: 'integer', example: 2 },
                total_income: { type: 'number', example: 8500.0 },
                total_expense: { type: 'number', example: 248.9 },
                net_amount: { type: 'number', example: 8251.1 },
                high_confidence_count: { type: 'integer', example: 2 },
                review_required_count: { type: 'integer', example: 0 }
              }
            },
            transactions: {
              type: 'array',
              items: { $ref: '#/components/schemas/ExtractedPdfTransaction' }
            }
          }
        },
        BatchTransactionItem: {
          type: 'object',
          additionalProperties: false,
          required: ['amount'],
          properties: {
            category_id: { type: 'string', format: 'uuid', nullable: true, example: '11111111-1111-4111-8111-111111111103' },
            amount: { type: 'number', exclusiveMinimum: 0, example: 248.9 },
            date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$', example: '2026-11-07' },
            description: { type: 'string', maxLength: 255, nullable: true, example: 'SUPERMERCADO CENTRAL' },
            is_automated: { type: 'boolean', default: true, example: true }
          }
        },
        BatchCreateTransactionsRequest: {
          type: 'object',
          additionalProperties: false,
          required: ['transactions'],
          properties: {
            transactions: {
              type: 'array',
              minItems: 1,
              maxItems: 200,
              items: { $ref: '#/components/schemas/BatchTransactionItem' }
            }
          }
        },
        PortfolioPosition: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            asset_id: { type: 'string', format: 'uuid' },
            ticker: { type: 'string', example: 'PETR4' },
            name: { type: 'string', nullable: true, example: 'Petrobras PN' },
            asset_type: { type: 'string', example: 'STOCK' },
            currency: { type: 'string', example: 'BRL' },
            quantity: { type: 'number', example: 200 },
            average_price: { type: 'number', example: 35.0 },
            current_price: { type: 'number', example: 38.5 },
            invested_value: { type: 'number', example: 7000.0 },
            current_value: { type: 'number', example: 7700.0 },
            total_value: { type: 'number', example: 7700.0 },
            profit_loss: { type: 'number', example: 700.0 },
            profit_loss_percentage: { type: 'number', example: 10.0 },
            allocation_percentage: { type: 'number', example: 100.0 },
            quote_source: { type: 'string', example: 'cache' },
            last_price_update: { type: 'string', format: 'date-time', nullable: true }
          }
        },
        ConsolidatedPortfolio: {
          type: 'object',
          properties: {
            user_id: { type: 'string', format: 'uuid' },
            total_portfolio_value: { type: 'number', example: 75000.0 },
            total_invested_value: { type: 'number', example: 68500.0 },
            total_profit_loss: { type: 'number', example: 6500.0 },
            total_profit_loss_percentage: { type: 'number', example: 9.49 },
            positions_count: { type: 'integer', example: 3 },
            allocation_by_type: {
              type: 'object',
              additionalProperties: {
                type: 'object',
                properties: {
                  total_value: { type: 'number', example: 7700.0 },
                  percentage: { type: 'number', example: 10.27 }
                }
              }
            },
            positions: {
              type: 'array',
              items: { $ref: '#/components/schemas/PortfolioPosition' }
            },
            consolidated_at: { type: 'string', format: 'date-time', example: '2026-11-18T15:00:00.000Z' }
          }
        },
        CronQuotesSummary: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['ok'], example: 'ok' },
            message: { type: 'string', nullable: true },
            timestamp: { type: 'string', format: 'date-time' },
            total: { type: 'integer', example: 4 },
            updated: { type: 'integer', example: 4 },
            failed: { type: 'integer', example: 0 },
            duration_ms: { type: 'integer', example: 320 },
            results: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  ticker: { type: 'string', example: 'PETR4' },
                  price: { type: 'number', nullable: true, example: 38.5 },
                  source: { type: 'string', nullable: true, example: 'brapi' },
                  status: { type: 'string', enum: ['updated', 'skipped', 'error'], example: 'updated' },
                  reason: { type: 'string', nullable: true },
                  error: { type: 'string', nullable: true }
                }
              }
            }
          }
        }
      }
    },
    paths: {
      '/': {
        get: {
          tags: ['System & Health'],
          summary: 'Informações básicas do serviço',
          description: 'Retorna metadados JSON da API quando chamado como API/JSON (ou entrega a tela de login HTML fora do prefixo /api quando Accept inclui text/html).',
          responses: {
            200: {
              description: 'Serviço ativo',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', example: 'ok' },
                      service: { type: 'string', example: 'PersonalController API' },
                      timestamp: { type: 'string', format: 'date-time' }
                    }
                  }
                }
              }
            },
            429: commonAuthErrors[429]
          }
        }
      },
      '/health': {
        get: {
          tags: ['System & Health'],
          summary: 'Healthcheck do backend e pipeline',
          responses: {
            200: {
              description: 'Aplicação operacional',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', example: 'ok' },
                      pipeline: { type: 'string', example: 'running' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/auth/signup': {
        post: {
          tags: ['Auth'],
          summary: 'Cadastrar nova conta de usuário',
          requestBody: {
            required: true,
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/SignupRequest' } }
            }
          },
          responses: {
            201: {
              description: 'Usuário cadastrado com sucesso (retorna sessão JWT quando confirmação automática está ativa).',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthSuccessResponse' } } }
            },
            400: {
              description: 'Dados inválidos, campo extra (Mass Assignment) ou e-mail já cadastrado.',
              content: { 'application/json': { schema: errorResponseRef } }
            },
            429: commonAuthErrors[429],
            500: commonAuthErrors[500]
          }
        }
      },
      '/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Autenticar usuário com e-mail e senha',
          requestBody: {
            required: true,
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } }
            }
          },
          responses: {
            200: {
              description: 'Autenticação concluída com emissão do token JWT.',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthSuccessResponse' } } }
            },
            400: {
              description: 'Payload inválido ou campos extras bloqueados por SEC-04.',
              content: { 'application/json': { schema: errorResponseRef } }
            },
            401: {
              description: 'Credenciais inválidas.',
              content: { 'application/json': { schema: errorResponseRef } }
            },
            429: commonAuthErrors[429],
            500: commonAuthErrors[500]
          }
        }
      },
      '/auth/logout': {
        post: {
          tags: ['Auth'],
          summary: 'Encerrar sessão de autenticação atual',
          responses: {
            200: {
              description: 'Sessão encerrada com sucesso.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', example: 'ok' },
                      message: { type: 'string', example: 'Sessão encerrada com sucesso' }
                    }
                  }
                }
              }
            },
            429: commonAuthErrors[429],
            500: commonAuthErrors[500]
          }
        }
      },
      '/auth/me': {
        get: {
          tags: ['Auth'],
          summary: 'Obter dados do usuário autenticado pelo JWT',
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: 'Perfil sanitizado do usuário autenticado.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', example: 'ok' },
                      user: { $ref: '#/components/schemas/UserResponse' }
                    }
                  }
                }
              }
            },
            ...commonAuthErrors
          }
        }
      },
      '/categories': {
        get: {
          tags: ['Categories'],
          summary: 'Listar categorias do sistema e customizadas do usuário',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'type',
              in: 'query',
              required: false,
              schema: { type: 'string', enum: ['INCOME', 'EXPENSE'] },
              description: 'Filtra categorias por tipo de fluxo.'
            }
          ],
          responses: {
            200: {
              description: 'Lista ordenada de categorias.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', example: 'ok' },
                      count: { type: 'integer', example: 5 },
                      data: { type: 'array', items: { $ref: '#/components/schemas/Category' } }
                    }
                  }
                }
              }
            },
            400: {
              description: 'Parâmetro `type` inválido.',
              content: { 'application/json': { schema: errorResponseRef } }
            },
            ...commonAuthErrors
          }
        },
        post: {
          tags: ['Categories'],
          summary: 'Criar categoria customizada para o usuário autenticado',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/CreateCategoryRequest' } }
            }
          },
          responses: {
            201: {
              description: 'Categoria criada com sucesso.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', example: 'ok' },
                      data: { $ref: '#/components/schemas/Category' }
                    }
                  }
                }
              }
            },
            400: {
              description: 'Erro de validação ou campo não permitido (SEC-04).',
              content: { 'application/json': { schema: errorResponseRef } }
            },
            ...commonAuthErrors
          }
        }
      },
      '/categories/{id}': {
        get: {
          tags: ['Categories'],
          summary: 'Obter detalhes de uma categoria acessível por ID',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
          ],
          responses: {
            200: {
              description: 'Categoria encontrada.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', example: 'ok' },
                      data: { $ref: '#/components/schemas/Category' }
                    }
                  }
                }
              }
            },
            404: { description: 'Categoria não encontrada.', content: { 'application/json': { schema: errorResponseRef } } },
            ...commonAuthErrors
          }
        },
        put: {
          tags: ['Categories'],
          summary: 'Atualizar categoria customizada pertencente ao usuário',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/UpdateCategoryRequest' } }
            }
          },
          responses: {
            200: {
              description: 'Categoria atualizada.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', example: 'ok' },
                      data: { $ref: '#/components/schemas/Category' }
                    }
                  }
                }
              }
            },
            400: { description: 'Payload inválido ou vazio.', content: { 'application/json': { schema: errorResponseRef } } },
            404: { description: 'Categoria não encontrada ou protegida (sistema/outro usuário).', content: { 'application/json': { schema: errorResponseRef } } },
            ...commonAuthErrors
          }
        },
        delete: {
          tags: ['Categories'],
          summary: 'Excluir categoria customizada pertencente ao usuário',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
          ],
          responses: {
            200: {
              description: 'Categoria excluída com sucesso.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', example: 'ok' },
                      message: { type: 'string', example: 'Categoria excluída com sucesso' },
                      data: { $ref: '#/components/schemas/Category' }
                    }
                  }
                }
              }
            },
            404: { description: 'Categoria não encontrada ou sem permissão.', content: { 'application/json': { schema: errorResponseRef } } },
            ...commonAuthErrors
          }
        }
      },
      '/transactions': {
        get: {
          tags: ['Transactions'],
          summary: 'Listar transações do usuário autenticado',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'start_date', in: 'query', required: false, schema: { type: 'string', format: 'date' }, description: 'Data inicial (AAAA-MM-DD)' },
            { name: 'end_date', in: 'query', required: false, schema: { type: 'string', format: 'date' }, description: 'Data final (AAAA-MM-DD)' },
            { name: 'category_id', in: 'query', required: false, schema: { type: 'string', format: 'uuid' }, description: 'Filtrar por categoria UUID' },
            { name: 'limit', in: 'query', required: false, schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 } },
            { name: 'offset', in: 'query', required: false, schema: { type: 'integer', minimum: 0, default: 0 } }
          ],
          responses: {
            200: {
              description: 'Lista paginada de transações.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', example: 'ok' },
                      count: { type: 'integer', example: 2 },
                      limit: { type: 'integer', example: 50 },
                      offset: { type: 'integer', example: 0 },
                      data: { type: 'array', items: { $ref: '#/components/schemas/Transaction' } }
                    }
                  }
                }
              }
            },
            ...commonAuthErrors
          }
        },
        post: {
          tags: ['Transactions'],
          summary: 'Criar transação financeira para o usuário autenticado',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/CreateTransactionRequest' } }
            }
          },
          responses: {
            201: {
              description: 'Transação criada com sucesso.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', example: 'ok' },
                      data: { $ref: '#/components/schemas/Transaction' }
                    }
                  }
                }
              }
            },
            400: { description: 'Payload inválido ou campos não permitidos (SEC-04).', content: { 'application/json': { schema: errorResponseRef } } },
            ...commonAuthErrors
          }
        }
      },
      '/transactions/parse-pdf': {
        post: {
          tags: ['Transactions'],
          summary: 'Extrair e pré-classificar transações de extrato ou fatura PDF (E07.T01)',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ParsePdfRequest' } }
            }
          },
          responses: {
            200: {
              description: 'Transações extraídas e pré-classificadas para conciliação.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', example: 'ok' },
                      data: { $ref: '#/components/schemas/ParsePdfResponseData' }
                    }
                  }
                }
              }
            },
            400: { description: 'PDF inválido, sem texto/conteúdo ou payload fora do schema .strict().', content: { 'application/json': { schema: errorResponseRef } } },
            413: { description: 'Arquivo PDF excede o limite de 5 MB.', content: { 'application/json': { schema: errorResponseRef } } },
            ...commonAuthErrors
          }
        }
      },
      '/transactions/batch': {
        post: {
          tags: ['Transactions'],
          summary: 'Confirmar e persistir lote de transações conciliadas (E07.T01/T02)',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/BatchCreateTransactionsRequest' } }
            }
          },
          responses: {
            201: {
              description: 'Lote persistido com sucesso (`is_automated: true` por padrão).',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', example: 'ok' },
                      count: { type: 'integer', example: 2 },
                      data: { type: 'array', items: { $ref: '#/components/schemas/Transaction' } }
                    }
                  }
                }
              }
            },
            400: { description: 'Lista vazia, acima de 200 itens ou campo inválido (SEC-04).', content: { 'application/json': { schema: errorResponseRef } } },
            ...commonAuthErrors
          }
        }
      },
      '/transactions/{id}': {
        get: {
          tags: ['Transactions'],
          summary: 'Consultar transação por ID do usuário autenticado',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
          ],
          responses: {
            200: {
              description: 'Transação encontrada.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', example: 'ok' },
                      data: { $ref: '#/components/schemas/Transaction' }
                    }
                  }
                }
              }
            },
            404: { description: 'Transação não encontrada.', content: { 'application/json': { schema: errorResponseRef } } },
            ...commonAuthErrors
          }
        },
        put: {
          tags: ['Transactions'],
          summary: 'Atualizar transação pertencente ao usuário autenticado',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/UpdateTransactionRequest' } }
            }
          },
          responses: {
            200: {
              description: 'Transação atualizada.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', example: 'ok' },
                      data: { $ref: '#/components/schemas/Transaction' }
                    }
                  }
                }
              }
            },
            400: { description: 'Dados inválidos ou nenhum campo enviado.', content: { 'application/json': { schema: errorResponseRef } } },
            404: { description: 'Transação não encontrada.', content: { 'application/json': { schema: errorResponseRef } } },
            ...commonAuthErrors
          }
        },
        delete: {
          tags: ['Transactions'],
          summary: 'Excluir transação pertencente ao usuário autenticado',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
          ],
          responses: {
            200: {
              description: 'Transação excluída com sucesso.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', example: 'ok' },
                      message: { type: 'string', example: 'Transação excluída com sucesso' },
                      data: { $ref: '#/components/schemas/Transaction' }
                    }
                  }
                }
              }
            },
            404: { description: 'Transação não encontrada.', content: { 'application/json': { schema: errorResponseRef } } },
            ...commonAuthErrors
          }
        }
      },
      '/portfolio/consolidated': {
        get: {
          tags: ['Portfolio'],
          summary: 'Obter portfólio consolidado com alocação e lucro/prejuízo (E03.T03)',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'refresh',
              in: 'query',
              required: false,
              schema: { type: 'string', enum: ['true', 'false'] },
              description: 'Quando `true`, força atualização remota das cotações antes de consolidar.'
            }
          ],
          responses: {
            200: {
              description: 'Posição consolidada do portfólio.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', example: 'ok' },
                      data: { $ref: '#/components/schemas/ConsolidatedPortfolio' }
                    }
                  }
                }
              }
            },
            400: {
              description: 'Parâmetros de consulta inválidos ou extras bloqueados (SEC-04).',
              content: { 'application/json': { schema: errorResponseRef } }
            },
            ...commonAuthErrors
          }
        }
      },
      '/cron/quotes': {
        get: {
          tags: ['Cron & Workers'],
          summary: 'Disparar worker de atualização de cotações de mercado (Cron Vercel)',
          security: [{ cronAuth: [] }, {}],
          parameters: [
            {
              name: 'force',
              in: 'query',
              required: false,
              schema: { type: 'string', enum: ['true', 'false'] },
              description: 'Quando `true`, ignora o cache em memória ao consultar provedores.'
            }
          ],
          responses: {
            200: {
              description: 'Resumo da execução do worker de cotações.',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/CronQuotesSummary' } } }
            },
            401: { description: 'CRON_SECRET inválido ou ausente quando configurado no servidor.', content: { 'application/json': { schema: errorResponseRef } } },
            500: commonAuthErrors[500]
          }
        },
        post: {
          tags: ['Cron & Workers'],
          summary: 'Disparar worker de cotações manualmente via POST',
          security: [{ cronAuth: [] }, {}],
          parameters: [
            {
              name: 'force',
              in: 'query',
              required: false,
              schema: { type: 'string', enum: ['true', 'false'] }
            }
          ],
          requestBody: {
            required: false,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    force: { type: 'boolean', example: true }
                  }
                }
              }
            }
          },
          responses: {
            200: {
              description: 'Resumo da execução do worker de cotações.',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/CronQuotesSummary' } } }
            },
            401: { description: 'CRON_SECRET inválido ou ausente.', content: { 'application/json': { schema: errorResponseRef } } },
            500: commonAuthErrors[500]
          }
        }
      }
    }
  };
}

const openApiSpec = buildOpenApiSpec();

module.exports = {
  buildOpenApiSpec,
  openApiSpec
};
