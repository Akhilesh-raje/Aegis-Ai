import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Users, Globe, Plus, Trash2, Key, AlertTriangle } from 'lucide-react';
import { fetchWebhooks, addWebhook, deleteWebhook, fetchUsers, addUser, deleteUser } from '../services/api';
// Auth neutralized for direct specialized access

export default function Settings() {
  const queryClient = useQueryClient();
  const user = { username: 'Analyst', role: 'admin' };
  
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('l1_analyst');

  const { data: webhooks = [] } = useQuery({ queryKey: ['webhooks'], queryFn: fetchWebhooks });
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: fetchUsers });

  const addWebhookMutation = useMutation({
    mutationFn: addWebhook,
    onSuccess: () => {
      queryClient.invalidateQueries(['webhooks']);
      setNewWebhookUrl('');
    }
  });

  const deleteWebhookMutation = useMutation({
    mutationFn: deleteWebhook,
    onSuccess: () => queryClient.invalidateQueries(['webhooks'])
  });

  const addUserMutation = useMutation({
    mutationFn: ({ username, password, role }) => addUser(username, password, role),
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      setNewUsername('');
      setNewPassword('');
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => queryClient.invalidateQueries(['users'])
  });

  if (user?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
        <Shield className="w-16 h-16 text-yellow-500/50 mb-4" />
        <h2 className="text-2xl font-bold font-display text-white">Access Denied</h2>
        <p className="text-gray-400">Settings Configuration is restricted to Level 5 (Admin) personnel only.</p>
        <div className="px-4 py-2 mt-4 text-xs font-mono font-bold text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          YOUR CURRENT CLEARANCE: {user?.role.toUpperCase()}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h2 className="text-xl font-bold font-display tracking-tight">System Configuration</h2>
        <p className="text-sm text-gray-400">Manage environment integrations and analyst personnel.</p>
      </div>

      <div className="grid grid-cols-2 gap-8">
        
        {/* WEBHOOKS SECTION */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 pb-2 border-b border-white/10">
            <Globe className="w-5 h-5 text-blue-400" />
            <h3 className="font-semibold text-gray-200">SIEM Integrations (Webhooks)</h3>
          </div>
          
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="https://hooks.slack.com/..." 
              value={newWebhookUrl}
              onChange={e => setNewWebhookUrl(e.target.value)}
              className="flex-1 px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500/50"
            />
            <button 
              onClick={() => newWebhookUrl && addWebhookMutation.mutate(newWebhookUrl)}
              className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 rounded-lg transition-colors flex items-center gap-2 text-sm font-bold"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>

          <div className="space-y-2">
            {webhooks.length === 0 && <div className="text-xs text-gray-500 italic p-4 text-center border border-white/5 bg-black/20 rounded-lg">No active webhooks. Setup forwarding to push Critical alerts out externally.</div>}
            {webhooks.map(hook => (
              <div key={hook.id} className="p-3 bg-white/5 border border-white/10 rounded-lg flex items-center justify-between group">
                <div className="flex flex-col overflow-hidden">
                  <span className="text-xs font-mono text-gray-300 truncate">{hook.url}</span>
                  <span className="text-[9px] text-gray-500 uppercase tracking-widest mt-1">Added by: {hook.added_by}</span>
                </div>
                <button 
                  onClick={() => deleteWebhookMutation.mutate(hook.id)}
                  className="p-1.5 text-red-400 hover:bg-red-500/20 rounded opacity-0 group-hover:opacity-100 transition-all ml-4 shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* USERS SECTION */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 pb-2 border-b border-white/10">
            <Users className="w-5 h-5 text-[var(--color-accent)]" />
            <h3 className="font-semibold text-gray-200">Analyst Directory</h3>
          </div>
          
          <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-3">
             <div className="grid grid-cols-2 gap-3">
               <input 
                 type="text" 
                 placeholder="Username" 
                 value={newUsername}
                 onChange={e => setNewUsername(e.target.value)}
                 className="px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[var(--color-accent)]/50"
               />
               <input 
                 type="password" 
                 placeholder="Password" 
                 value={newPassword}
                 onChange={e => setNewPassword(e.target.value)}
                 className="px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[var(--color-accent)]/50"
               />
             </div>
             <div className="flex gap-3">
                <select 
                  value={newRole}
                  onChange={e => setNewRole(e.target.value)}
                  className="flex-1 px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[var(--color-accent)]/50"
                >
                  <option value="l1_analyst">L1 Analyst (View Only)</option>
                  <option value="l2_responder">L2 Responder (Playbook Access)</option>
                  <option value="admin">Admin (System Config)</option>
                </select>
                <button 
                  onClick={() => newUsername && newPassword && addUserMutation.mutate({username: newUsername, password: newPassword, role: newRole})}
                  className="px-4 py-2 bg-[var(--color-accent)]/20 hover:bg-[var(--color-accent)]/30 text-[var(--color-accent)] border border-[var(--color-accent)]/30 rounded-lg transition-colors flex items-center gap-2 text-sm font-bold shrink-0"
                >
                  <Key className="w-4 h-4" /> Provision User
                </button>
             </div>
          </div>

          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {users.map(u => (
              <div key={u.id} className="p-3 bg-white/5 border border-white/10 rounded-lg flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className={`w-2 h-2 rounded-full ${u.role === 'admin' ? 'bg-red-500' : u.role === 'l2_responder' ? 'bg-orange-500' : 'bg-blue-500'}`} />
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-200">{u.username}</span>
                    <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest mt-0.5">{u.role.replace('_', ' ')}</span>
                  </div>
                </div>
                {u.id !== user.id && (
                  <button 
                    onClick={() => deleteUserMutation.mutate(u.id)}
                    className="p-1.5 text-red-400 hover:bg-red-500/20 rounded opacity-0 group-hover:opacity-100 transition-all shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
