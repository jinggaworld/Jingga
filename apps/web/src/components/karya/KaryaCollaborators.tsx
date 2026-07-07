'use client';

import React from 'react';
import { Badge } from '@/components/ui/Badge';

interface Collaborator {
  wallet_address: string;
  nama: string | null;
  role: string;
  persentase: number;
}

interface KaryaCollaboratorsProps {
  collaborators: Collaborator[];
}

const roleLabels: Record<string, string> = {
  penulis: 'Writer',
  editor: 'Editor',
  ilustrator: 'Illustrator',
  kolaborator: 'Collaborator',
};

const roleBadgeVariant: Record<string, 'info' | 'success' | 'warning'> = {
  penulis: 'info',
  editor: 'success',
  ilustrator: 'warning',
  kolaborator: 'info',
};

export function KaryaCollaborators({ collaborators }: KaryaCollaboratorsProps) {
  if (!collaborators.length) return null;

  return (
    <div>
      <h3 className="text-card-title text-ink mb-md">Collaborators</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
        {collaborators.map((collab) => (
          <div
            key={collab.wallet_address}
            className="bg-surface-1 border border-hairline p-md rounded-none"
          >
            <div className="flex items-center justify-between mb-xs">
              <span className="text-body-emphasis text-ink">{collab.nama || 'Anonymous'}</span>
              <Badge variant={roleBadgeVariant[collab.role] || 'info'}>
                {roleLabels[collab.role] || collab.role}
              </Badge>
            </div>
            <p className="text-caption text-ink-subtle font-mono mb-xs">
              {collab.wallet_address.slice(0, 8)}...{collab.wallet_address.slice(-4)}
            </p>
            <p className="text-body-sm text-primary">{collab.persentase}%</p>
          </div>
        ))}
      </div>
    </div>
  );
}
