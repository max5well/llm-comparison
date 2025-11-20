import React from 'react';
import { Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { clsx } from 'clsx';

export interface ModelRanking {
  rank: number;
  model: string;
  provider: string;
  overallScore: number | null;
  accuracy: number | null;
  faithfulness: number | null;
  reasoning: number | null;
  contextUtilization: number | null;
  latencyMs: number;
  costUsd: number;
}

interface ModelLeaderboardProps {
  rankings: ModelRanking[];
  className?: string;
}

export const ModelLeaderboard: React.FC<ModelLeaderboardProps> = ({
  rankings,
  className,
}) => {
  const getRankIcon = (rank: number) => {
    if (rank === 1) {
      return <Trophy className="w-5 h-5 text-yellow-500" />;
    }
    if (rank === 2) {
      return <Trophy className="w-5 h-5 text-gray-400" />;
    }
    if (rank === 3) {
      return <Trophy className="w-5 h-5 text-orange-400" />;
    }
    return <span className="text-gray-500 font-semibold">#{rank}</span>;
  };

  const formatScore = (score: number | null) => {
    if (score === null || score === undefined) return 'N/A';
    return (score * 100).toFixed(1) + '%';
  };

  const formatLatency = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className={clsx('card', className)}>
      <h3 className="text-xl font-semibold mb-6 text-gray-900">Model Leaderboard</h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Rank</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Model</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Overall</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Accuracy</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Faithfulness</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Reasoning</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Context Util.</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Latency</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Cost</th>
            </tr>
          </thead>
          <tbody>
            {rankings.map((model, idx) => (
              <tr
                key={`${model.provider}-${model.model}`}
                className={clsx(
                  'border-b border-gray-100 hover:bg-gray-50 transition-colors',
                  idx === 0 && 'bg-yellow-50',
                  idx === 1 && 'bg-gray-50',
                  idx === 2 && 'bg-orange-50'
                )}
              >
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    {getRankIcon(model.rank)}
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div>
                    <div className="font-semibold text-gray-900">
                      {model.provider}: {model.model}
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4 text-right">
                  <span className="font-semibold text-gray-900">
                    {formatScore(model.overallScore)}
                  </span>
                </td>
                <td className="py-4 px-4 text-right text-sm text-gray-700">
                  {formatScore(model.accuracy)}
                </td>
                <td className="py-4 px-4 text-right text-sm text-gray-700">
                  {formatScore(model.faithfulness)}
                </td>
                <td className="py-4 px-4 text-right text-sm text-gray-700">
                  {formatScore(model.reasoning)}
                </td>
                <td className="py-4 px-4 text-right text-sm text-gray-700">
                  {formatScore(model.contextUtilization)}
                </td>
                <td className="py-4 px-4 text-right text-sm text-gray-700">
                  {formatLatency(model.latencyMs)}
                </td>
                <td className="py-4 px-4 text-right text-sm text-gray-700">
                  ${model.costUsd.toFixed(4)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

