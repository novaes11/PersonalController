const { fetchConsolidatedPortfolio } = require('../services/portfolioApi');

const ASSET_TYPE_METADATA = {
  STOCK: { label: 'Ações (B3)', color: '#6366F1' },
  FII: { label: 'Fundos Imobiliários (FII)', color: '#10B981' },
  CRYPTO: { label: 'Criptoativos', color: '#F59E0B' },
  FIXED_INCOME: { label: 'Renda Fixa', color: '#06B6D4' },
  CURRENCY: { label: 'Câmbio / Moedas', color: '#EC4899' },
  ETF: { label: 'ETFs', color: '#8B5CF6' },
  OTHER: { label: 'Outros', color: '#64748B' }
};

const DONUT_RADIUS = 40;
const DONUT_CIRCUMFERENCE = Number((2 * Math.PI * DONUT_RADIUS).toFixed(4)); // ~251.3274

function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function round2(value) {
  return Number((Number(value) || 0).toFixed(2));
}

function formatPortfolioBRL(value) {
  const num = Number(value) || 0;
  return `R$ ${num.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

/**
 * Calcula os segmentos geométricos do Gráfico de Rosca (Donut Chart SVG)
 * a partir do payload retornado por GET /api/portfolio/consolidated (E04.T04).
 *
 * @param {object} consolidatedData Payload `data` do endpoint `/portfolio/consolidated`
 */
function computeDonutChartSegments(consolidatedData = {}) {
  const positions = Array.isArray(consolidatedData?.positions) ? consolidatedData.positions : [];
  const totalValue = Number(consolidatedData?.total_portfolio_value) ||
    round2(positions.reduce((acc, p) => acc + (Number(p.current_value ?? p.total_value) || 0), 0));

  let allocationMap = consolidatedData?.allocation_by_type;

  // Caso allocation_by_type não esteja pré-populado, agrega a partir de positions
  if (!allocationMap || Object.keys(allocationMap).length === 0) {
    allocationMap = {};
    for (const pos of positions) {
      const type = pos.asset_type || 'OTHER';
      const val = Number(pos.current_value ?? pos.total_value) || 0;
      if (val <= 0) continue;
      if (!allocationMap[type]) {
        allocationMap[type] = { total_value: 0, percentage: 0 };
      }
      allocationMap[type].total_value = round2(allocationMap[type].total_value + val);
    }
    for (const type of Object.keys(allocationMap)) {
      allocationMap[type].percentage = totalValue > 0
        ? round2((allocationMap[type].total_value / totalValue) * 100)
        : 0;
    }
  }

  const entries = Object.entries(allocationMap)
    .filter(([, info]) => (Number(info?.total_value) || 0) > 0)
    .sort((a, b) => (Number(b[1].total_value) || 0) - (Number(a[1].total_value) || 0));

  let cumulativePercent = 0;

  const segments = entries.map(([assetType, info]) => {
    const meta = ASSET_TYPE_METADATA[assetType] || ASSET_TYPE_METADATA.OTHER;
    const value = round2(info.total_value);
    const percentage = totalValue > 0
      ? round2(info.percentage !== undefined ? info.percentage : (value / totalValue) * 100)
      : 0;

    const segmentLength = Number(((percentage / 100) * DONUT_CIRCUMFERENCE).toFixed(4));
    const gapLength = Number((DONUT_CIRCUMFERENCE - segmentLength).toFixed(4));
    const dashOffset = Number((DONUT_CIRCUMFERENCE * (1 - cumulativePercent / 100)).toFixed(4));

    cumulativePercent += percentage;

    return {
      asset_type: assetType,
      label: meta.label,
      color: meta.color,
      total_value: value,
      percentage,
      stroke_dasharray: `${segmentLength} ${gapLength}`,
      stroke_dashoffset: dashOffset
    };
  });

  return {
    total_portfolio_value: totalValue,
    total_invested_value: round2(consolidatedData?.total_invested_value || 0),
    total_profit_loss: round2(consolidatedData?.total_profit_loss || 0),
    total_profit_loss_percentage: round2(consolidatedData?.total_profit_loss_percentage || 0),
    radius: DONUT_RADIUS,
    circumference: DONUT_CIRCUMFERENCE,
    segments,
    positions
  };
}

/**
 * Componente React AssetAllocationChart (E04.T04).
 * Renderiza o Gráfico de Rosca (Donut Chart SVG) e legenda de alocação consumindo /portfolio/consolidated.
 *
 * @param {object} props
 * @param {object} [props.portfolio] Payload `data` de GET /api/portfolio/consolidated
 * @param {boolean} [props.isLoading=false]
 * @param {string|null} [props.error=null]
 * @param {object} [ReactInstance]
 */
function AssetAllocationChart(props = {}, ReactInstance = global.React) {
  const {
    portfolio = {},
    isLoading = false,
    error = null
  } = props;

  const chartData = computeDonutChartSegments(portfolio);

  if (ReactInstance && typeof ReactInstance.createElement === 'function') {
    const h = ReactInstance.createElement;

    if (error) {
      return h(
        'div',
        {
          role: 'alert',
          'aria-live': 'assertive',
          className: 'rounded-xl bg-red-950/60 border border-red-800 p-4 text-sm text-red-200'
        },
        error
      );
    }

    if (isLoading) {
      return h(
        'div',
        {
          role: 'status',
          'aria-live': 'polite',
          className: 'rounded-xl bg-slate-900 border border-slate-800 p-6 text-center text-sm text-slate-400'
        },
        'Carregando distribuição de ativos...'
      );
    }

    if (chartData.segments.length === 0) {
      return h(
        'section',
        {
          id: 'asset-allocation-chart-section',
          'aria-label': 'Gráfico de distribuição de ativos',
          className: 'bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg text-slate-100'
        },
        h('h2', { className: 'text-lg font-semibold text-white tracking-tight' }, 'Distribuição de Ativos'),
        h('p', { className: 'text-sm text-slate-400 mt-4 text-center py-6' }, 'Nenhum ativo em custódia para exibir no gráfico.')
      );
    }

    const svgCircles = [
      // Trilha de fundo da rosca
      h('circle', {
        key: 'bg-ring',
        cx: '50',
        cy: '50',
        r: String(DONUT_RADIUS),
        fill: 'transparent',
        stroke: '#1E293B',
        strokeWidth: '12'
      }),
      ...chartData.segments.map(seg =>
        h('circle', {
          key: seg.asset_type,
          'data-segment-type': seg.asset_type,
          'data-segment-percentage': String(seg.percentage),
          cx: '50',
          cy: '50',
          r: String(DONUT_RADIUS),
          fill: 'transparent',
          stroke: seg.color,
          strokeWidth: '12',
          strokeDasharray: seg.stroke_dasharray,
          strokeDashoffset: String(seg.stroke_dashoffset),
          transform: 'rotate(-90 50 50)'
        })
      )
    ];

    const legendItems = chartData.segments.map(seg =>
      h(
        'li',
        {
          key: seg.asset_type,
          'data-legend-type': seg.asset_type,
          className: 'flex items-center justify-between py-2 border-b border-slate-800/70 last:border-none'
        },
        h(
          'div',
          { className: 'flex items-center gap-2.5' },
          h('span', {
            'aria-hidden': 'true',
            style: { backgroundColor: seg.color },
            className: 'w-3 h-3 rounded-full inline-block'
          }),
          h('span', { className: 'text-sm font-medium text-slate-200' }, seg.label)
        ),
        h(
          'div',
          { className: 'text-right' },
          h('span', { className: 'text-sm font-semibold text-white mr-2' }, formatPortfolioBRL(seg.total_value)),
          h('span', { className: 'text-xs font-medium text-slate-400' }, `(${seg.percentage.toFixed(2)}%)`)
        )
      )
    );

    return h(
      'section',
      {
        id: 'asset-allocation-chart-section',
        'aria-label': 'Gráfico de distribuição de ativos',
        className: 'bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg text-slate-100'
      },
      h(
        'div',
        { className: 'border-b border-slate-800 pb-4 mb-6 flex items-center justify-between' },
        h(
          'div',
          null,
          h('h2', { className: 'text-lg font-semibold text-white tracking-tight' }, 'Distribuição de Ativos'),
          h('p', { className: 'text-sm text-slate-400 mt-1' }, 'Alocação consolidada da carteira por classe de ativo.')
        ),
        h(
          'div',
          { className: 'text-right' },
          h('span', { className: 'text-xs uppercase tracking-wider text-slate-400 block' }, 'Patrimônio Consolidado'),
          h(
            'span',
            { 'data-portfolio-total': 'true', className: 'text-lg font-bold text-white' },
            formatPortfolioBRL(chartData.total_portfolio_value)
          )
        )
      ),
      h(
        'div',
        { className: 'grid grid-cols-1 md:grid-cols-2 gap-6 items-center' },
        h(
          'div',
          { className: 'flex justify-center' },
          h(
            'svg',
            {
              id: 'asset-allocation-donut-svg',
              role: 'img',
              'aria-label': 'Gráfico de rosca de distribuição de ativos',
              viewBox: '0 0 100 100',
              className: 'w-48 h-48'
            },
            svgCircles
          )
        ),
        h(
          'ul',
          { id: 'asset-allocation-legend', className: 'space-y-1' },
          legendItems
        )
      )
    );
  }

  return {
    type: 'AssetAllocationChart',
    props: {
      chartData,
      isLoading,
      error
    },
    html: renderAssetAllocationChartMarkup(props)
  };
}

/**
 * Renderiza o HTML e SVG semântico do Gráfico de Rosca (Donut Chart) de Distribuição de Ativos.
 */
function renderAssetAllocationChartMarkup(props = {}) {
  const {
    portfolio = {},
    isLoading = false,
    error = null
  } = props;

  if (error) {
    return `<div role="alert" aria-live="assertive" class="rounded-xl bg-red-950/60 border border-red-800 p-4 text-sm text-red-200">${escapeHtml(error)}</div>`;
  }

  if (isLoading) {
    return `<div role="status" aria-live="polite" class="rounded-xl bg-slate-900 border border-slate-800 p-6 text-center text-sm text-slate-400">Carregando distribuição de ativos...</div>`;
  }

  const chartData = computeDonutChartSegments(portfolio);

  if (chartData.segments.length === 0) {
    return `
<section id="asset-allocation-chart-section" aria-label="Gráfico de distribuição de ativos" class="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg text-slate-100">
  <h2 class="text-lg font-semibold text-white tracking-tight">Distribuição de Ativos</h2>
  <p class="text-sm text-slate-400 mt-4 text-center py-6">Nenhum ativo em custódia para exibir no gráfico.</p>
</section>`.trim();
  }

  const segmentsSvgHtml = chartData.segments
    .map(
      seg =>
        `<circle data-segment-type="${escapeHtml(seg.asset_type)}" data-segment-percentage="${seg.percentage}" cx="50" cy="50" r="${DONUT_RADIUS}" fill="transparent" stroke="${escapeHtml(seg.color)}" stroke-width="12" stroke-dasharray="${escapeHtml(seg.stroke_dasharray)}" stroke-dashoffset="${seg.stroke_dashoffset}" transform="rotate(-90 50 50)" />`
    )
    .join('');

  const legendHtml = chartData.segments
    .map(
      seg =>
        `<li data-legend-type="${escapeHtml(seg.asset_type)}" class="flex items-center justify-between py-2 border-b border-slate-800/70 last:border-none">
          <div class="flex items-center gap-2.5">
            <span aria-hidden="true" style="background-color: ${escapeHtml(seg.color)}" class="w-3 h-3 rounded-full inline-block"></span>
            <span class="text-sm font-medium text-slate-200">${escapeHtml(seg.label)}</span>
          </div>
          <div class="text-right">
            <span class="text-sm font-semibold text-white mr-2">${escapeHtml(formatPortfolioBRL(seg.total_value))}</span>
            <span class="text-xs font-medium text-slate-400">(${seg.percentage.toFixed(2)}%)</span>
          </div>
        </li>`
    )
    .join('');

  return `
<section id="asset-allocation-chart-section" aria-label="Gráfico de distribuição de ativos" class="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg text-slate-100">
  <div class="border-b border-slate-800 pb-4 mb-6 flex items-center justify-between">
    <div>
      <h2 class="text-lg font-semibold text-white tracking-tight">Distribuição de Ativos</h2>
      <p class="text-sm text-slate-400 mt-1">Alocação consolidada da carteira por classe de ativo.</p>
    </div>
    <div class="text-right">
      <span class="text-xs uppercase tracking-wider text-slate-400 block">Patrimônio Consolidado</span>
      <span data-portfolio-total="true" class="text-lg font-bold text-white">${escapeHtml(formatPortfolioBRL(chartData.total_portfolio_value))}</span>
    </div>
  </div>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
    <div class="flex justify-center">
      <svg id="asset-allocation-donut-svg" role="img" aria-label="Gráfico de rosca de distribuição de ativos" viewBox="0 0 100 100" class="w-48 h-48">
        <circle cx="50" cy="50" r="${DONUT_RADIUS}" fill="transparent" stroke="#1E293B" stroke-width="12" />
        ${segmentsSvgHtml}
      </svg>
    </div>
    <ul id="asset-allocation-legend" class="space-y-1">
      ${legendHtml}
    </ul>
  </div>
</section>`.trim();
}

/**
 * Controlador de estado para o Gráfico de Distribuição de Ativos (E04.T04).
 * Consome GET /api/portfolio/consolidated e atualiza os segmentos do gráfico de rosca.
 */
function createAssetAllocationChartController(options = {}) {
  const {
    token = null,
    baseUrl = '/api',
    fetchImpl = global.fetch
  } = options;

  const state = {
    portfolio: null,
    chartData: computeDonutChartSegments({}),
    isLoading: false,
    error: null
  };

  async function loadPortfolio(refresh = false) {
    state.isLoading = true;
    state.error = null;
    try {
      const portfolioData = await fetchConsolidatedPortfolio({
        token,
        baseUrl,
        refresh,
        fetchImpl
      });
      state.portfolio = portfolioData;
      state.chartData = computeDonutChartSegments(portfolioData);
      return state.chartData;
    } catch (err) {
      state.error = err.message;
      throw err;
    } finally {
      state.isLoading = false;
    }
  }

  function render(ReactInstance) {
    return AssetAllocationChart(
      {
        portfolio: state.portfolio || {},
        isLoading: state.isLoading,
        error: state.error
      },
      ReactInstance
    );
  }

  return {
    getState: () => ({
      ...state,
      chartData: {
        ...state.chartData,
        segments: [...state.chartData.segments]
      }
    }),
    loadPortfolio,
    render
  };
}

module.exports = {
  ASSET_TYPE_METADATA,
  DONUT_RADIUS,
  DONUT_CIRCUMFERENCE,
  computeDonutChartSegments,
  AssetAllocationChart,
  renderAssetAllocationChartMarkup,
  createAssetAllocationChartController
};
