import type { BenchmarkPoint } from "@/types";

// Generates a 12-month indexed series (portfolio outperforming benchmark)
export function buildBenchmarkSeries(): BenchmarkPoint[] {
  const points: BenchmarkPoint[] = [];
  const months = 12;
  let portfolio = 100;
  let benchmark = 100;
  for (let i = 0; i <= months; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() - (months - i));
    d.setDate(1);
    // smoother portfolio drift with a small alpha
    const benchRet = Math.sin(i * 0.55) * 1.5 + 1.2 + (i === 5 ? -2.8 : 0);
    const portRet = benchRet + 0.6 + (i === 7 ? 1.6 : 0);
    benchmark = benchmark * (1 + benchRet / 100);
    portfolio = portfolio * (1 + portRet / 100);
    points.push({
      date: d.toISOString().slice(0, 10),
      portfolio: Number(portfolio.toFixed(2)),
      benchmark: Number(benchmark.toFixed(2)),
    });
  }
  return points;
}

export function buildDrawdownSeries(): { date: string; drawdown: number }[] {
  const series = buildBenchmarkSeries();
  let peak = -Infinity;
  return series.map((p) => {
    peak = Math.max(peak, p.portfolio);
    const dd = ((p.portfolio - peak) / peak) * 100;
    return { date: p.date, drawdown: Number(dd.toFixed(2)) };
  });
}
