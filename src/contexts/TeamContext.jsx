import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const TeamContext = createContext({});

export function TeamProvider({ children }) {
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [activeTeamId, setActiveTeamId] = useState(null);
  const [loadingTeams, setLoadingTeams] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTeams();
    } else {
      setTeams([]);
      setActiveTeamId(null);
      setLoadingTeams(false);
    }
  }, [user]);

  async function fetchTeams() {
    setLoadingTeams(true);
    try {
      // Find all teams the user belongs to
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          team_id,
          role,
          teams (
            id,
            name
          )
        `);

      if (error) throw error;

      const userTeams = data.map((tm) => tm.teams);
      setTeams(userTeams);

      // Restore active team from local storage or pick first one
      const storedTeamId = localStorage.getItem('coffeebreak_active_team');
      if (storedTeamId && userTeams.find(t => t.id === storedTeamId)) {
        setActiveTeamId(storedTeamId);
      } else if (userTeams.length > 0) {
        setActiveTeam(userTeams[0].id);
      }
    } catch (err) {
      console.error('Error fetching teams:', err.message);
      toast.error('Erro ao carregar seus times.');
    } finally {
      setLoadingTeams(false);
    }
  }

  function setActiveTeam(teamId) {
    setActiveTeamId(teamId);
    localStorage.setItem('coffeebreak_active_team', teamId);
    // Reload data context could be triggered here or children components listen to activeTeamId
  }

  async function createTeam(name) {
    try {
      // Invoca a function RPC (PostgreSQL Function) que criamos para evitar bloqueio de RLS
      // ao tentar inserir um time e ainda não ter permissão de leitura sobre ele.
      const { data: newTeamId, error: rpcError } = await supabase.rpc('create_team', { team_name: name });

      if (rpcError) throw rpcError;

      toast.success('Time criado com sucesso!');
      await fetchTeams();
      setActiveTeam(newTeamId);
      return newTeamId;
    } catch (err) {
      toast.error('Erro ao criar time: ' + err.message);
      throw err;
    }
  }

  // Helper object to provide active team details easily
  const activeTeam = teams.find(t => t.id === activeTeamId) || null;

  return (
    <TeamContext.Provider value={{ teams, activeTeam, activeTeamId, setActiveTeam, createTeam, loadingTeams, refreshTeams: fetchTeams }}>
      {!loadingTeams && children}
    </TeamContext.Provider>
  );
}

export function useTeam() {
  return useContext(TeamContext);
}
