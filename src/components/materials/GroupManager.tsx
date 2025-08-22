import React from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { apiCall } from "../../config/api";

interface MaterialGroup {
  group_id: string;
  group_name: string;
  group_description?: string;
  group_color?: string;
  sort_order?: number;
}

interface GroupManagerProps {
  onChanged: () => Promise<void> | void;
}

export function GroupManager({ onChanged }: GroupManagerProps) {
  const [groups, setGroups] = React.useState<MaterialGroup[]>([]);
  const [editingGroup, setEditingGroup] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<{ 
    group_id?: string; 
    group_name: string; 
    group_description?: string; 
    group_color?: string; 
    sort_order?: number 
  }>({ 
    group_name: '', 
    group_description: '', 
    group_color: '#888888', 
    sort_order: 999 
  });
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);

  const loadGroups = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiCall('/api/material-groups');
      if (res.ok) {
        const data = await res.json();
        console.log('Material groups API response:', data);
        // Extract groups from the nested data structure
        const groups = data.data?.groups || data.groups || [];
        console.log('Extracted groups:', groups);
        setGroups(groups);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { 
    loadGroups(); 
  }, [loadGroups]);

  const save = React.useCallback(async () => {
    if (!draft.group_name.trim()) return;
    setBusy(true);
    try {
      const res = await apiCall('/api/material-groups', { 
        method: 'POST', 
        body: JSON.stringify(draft) 
      });
      if (res.ok) {
        setDraft({ 
          group_name: '', 
          group_description: '', 
          group_color: '#888888', 
          sort_order: 999 
        });
        await loadGroups();
        await onChanged();
      }
    } finally {
      setBusy(false);
    }
  }, [draft, loadGroups, onChanged]);

  const update = React.useCallback(async (id: string, patch: Partial<MaterialGroup>) => {
    setBusy(true);
    try {
      const res = await apiCall(`/api/material-groups/${id}`, { 
        method: 'PUT', 
        body: JSON.stringify(patch) 
      });
      if (res.ok) {
        await loadGroups();
        await onChanged();
      }
    } finally {
      setBusy(false);
    }
  }, [loadGroups, onChanged]);

  const remove = React.useCallback(async (id: string) => {
    if (!confirm('Delete this group?')) return;
    setBusy(true);
    try {
      const res = await apiCall(`/api/material-groups/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        await loadGroups();
        await onChanged();
      } else {
        alert(data.error || 'Delete failed');
      }
    } finally {
      setBusy(false);
    }
  }, [loadGroups, onChanged]);

  return (
    <div className="space-y-6">
      {/* Material Groups List */}
      {loading ? (
        <div className="text-gray-500">Loading…</div>
      ) : (
        <div className="divide-y border rounded-md">
          {groups.map(g => (
            <div key={g.group_id} className="flex items-start gap-3 p-3">
              <div>
                <Button 
                  variant="outline" 
                  onClick={() => setEditingGroup(g.group_id)} 
                  title="Edit group"
                >
                  Edit
                </Button>
              </div>
              <div className="flex-1">
                <div className="font-medium">{g.group_name}</div>
                <div className="text-sm text-gray-600">{g.group_description || ''}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add New Group Section */}
      <div className="border rounded-md p-4 space-y-4">
        <h3 className="font-semibold">Add New Group</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Input 
            placeholder="Group name"
            value={draft.group_name} 
            onChange={e => setDraft(prev => ({ ...prev, group_name: e.target.value }))} 
          />
          <Input 
            placeholder="Description (optional)"
            value={draft.group_description || ''} 
            onChange={e => setDraft(prev => ({ ...prev, group_description: e.target.value }))} 
          />
          <div className="flex gap-2">
            <Input 
              type="number" 
              placeholder="Sort order"
              value={draft.sort_order ?? 999} 
              onChange={e => setDraft(prev => ({ ...prev, sort_order: Number(e.target.value) || 999 }))} 
            />
            <Button 
              onClick={save} 
              disabled={busy || !draft.group_name.trim()}
            >
              {busy ? 'Saving...' : 'Add'}
            </Button>
          </div>
        </div>
      </div>

      {/* Editor panel opens as a card when a group is selected */}
      {editingGroup && (
        <div className="border rounded-md p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Edit Group</h3>
            <Button variant="outline" onClick={() => setEditingGroup(null)}>Close</Button>
          </div>
          <div className="text-sm text-gray-700">Configure group settings</div>
          {groups.filter(g => g.group_id === editingGroup).map(g => (
            <div key={g.group_id} className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <Input 
                value={g.group_name} 
                onChange={e => update(g.group_id, { group_name: e.target.value })} 
                placeholder="Group name"
              />
              <Input 
                value={g.group_description || ''} 
                onChange={e => update(g.group_id, { group_description: e.target.value })} 
                placeholder="Description"
              />
              <div className="flex gap-2">
                <Input 
                  type="number" 
                  value={g.sort_order ?? 0} 
                  onChange={e => update(g.group_id, { sort_order: Number(e.target.value) || 0 })} 
                  placeholder="Sort order"
                />
                <Button 
                  variant="outline" 
                  onClick={() => remove(g.group_id)} 
                  disabled={busy}
                  className="text-red-600 hover:text-red-700"
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
