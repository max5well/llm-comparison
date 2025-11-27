import React from 'react';
import { Trophy } from 'lucide-react';
import clsx from 'clsx';

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
    <div className={clsx('bg-white rounded-xl border border-gray-200', className)}>
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-1">Model Leaderboard</h3>
            <p className="text-sm text-gray-600">Ranked by overall performance score</p>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Rank</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Model</th>
              <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
              <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
              <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Accuracy</th>
              <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Faithfulness</th>
              <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Latency</th>
              <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
              <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rankings.map((model, idx) => (
              <tr
                key={`${model.provider}-${model.model}`}
                className="hover:bg-gray-50 transition"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center justify-center w-8 h-8 bg-yellow-100 text-yellow-700 rounded-lg font-bold text-sm">
                    {model.rank}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-500 rounded-lg flex items-center justify-center">
                      <Trophy className="text-white text-xs" size={14} />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{model.model}</div>
                      <div className="text-xs text-gray-500">{model.provider}</div>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4 whitespace-nowrap">
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
                    {model.overallScore ? (model.overallScore * 100).toFixed(1) : 'N/A'}
                  </span>
                </td>
                <td className="py-4 px-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2 w-20">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ width: `${(model.accuracy || 0) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900 min-w-[3rem] text-right">
                      {formatScore(model.accuracy)}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2 w-20">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ width: `${(model.faithfulness || 0) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900 min-w-[3rem] text-right">
                      {formatScore(model.faithfulness)}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-900">
                    {formatLatency(model.latencyMs)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-900">
                    ${model.costUsd.toFixed(4)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

