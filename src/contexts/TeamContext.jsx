import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const TeamContext = createContext({});

export function TeamProvider({ children }) {
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [activeTeamId, setActiveTeamId] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTeams();
    } else {
      setTeams([]);
      setPendingRequests([]);
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

      // Fetch pending requests for this user
      const { data: reqData, error: reqError } = await supabase
        .from('team_requests')
        .select('*, teams(name)')
        .eq('status', 'pending');
        
      if (!reqError && reqData) {
        setPendingRequests(reqData);
      }

      // Restore active team from local storage or pick first one
      const storedTeamId = localStorage.getItem('coffeebreak_active_team');
      if (storedTeamId && userTeams.find(t => t.id === storedTeamId)) {
        setActiveTeam(storedTeamId); // use setActiveTeam instead of raw state to ensure consistency
      } else if (userTeams.length > 0) {
        setActiveTeam(userTeams[0].id);
      } else {
        setActiveTeamId(null);
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
    if (teamId) {
      localStorage.setItem('coffeebreak_active_team', teamId);
    } else {
      localStorage.removeItem('coffeebreak_active_team');
    }
  }

  async function createTeamSecure(name, description = '') {
    try {
      const { data: newTeamId, error: rpcError } = await supabase.rpc('create_team_secure', { 
        p_name: name, p_description: description
      });

      if (rpcError) throw rpcError;

      toast.success('Time criado com sucesso!');
      await fetchTeams();
      setActiveTeam(newTeamId);
      return newTeamId;
    } catch (err) {
      toast.error(err.message);
      throw err;
    }
  }

  async function requestJoinTeam(teamId, reason) {
    try {
      const { error: rpcError } = await supabase.rpc('request_team_join', { 
        p_team_id: teamId, 
        p_reason: reason 
      });

      if (rpcError) throw rpcError;

      toast.success('Solicitação enviada!');
      await fetchTeams();
    } catch (err) {
      toast.error(err.message);
      throw err;
    }
  }

  // Helper object to provide active team details easily
  const activeTeam = teams.find(t => t.id === activeTeamId) || null;
  const hasNoTeams = teams.length === 0;

  return (
    <TeamContext.Provider value={{ 
        teams, 
        activeTeam, 
        activeTeamId, 
        setActiveTeam, 
        createTeamSecure, 
        requestJoinTeam,
        pendingRequests,
        hasNoTeams,
        loadingTeams, 
        refreshTeams: fetchTeams 
      }}>
      {!loadingTeams && children}
    </TeamContext.Provider>
  );
}

export function useTeam() {
  return useContext(TeamContext);
}
