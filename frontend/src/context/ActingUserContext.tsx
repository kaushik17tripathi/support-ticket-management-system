import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { fetchUsers } from "../api/client";
import type { UserSummary } from "../api/types";

const STORAGE_KEY = "actingUserId";

type ActingUserContextValue = {
  users: UserSummary[];
  actingUserId: string;
  actingUser: UserSummary | null;
  hasActingUser: boolean;
  loading: boolean;
  error: string | null;
  setActingUserId: (id: string) => void;
  reloadUsers: () => Promise<void>;
  actingUserAlert: string | null;
  setActingUserAlert: (message: string | null) => void;
};

const ActingUserContext = createContext<ActingUserContextValue | null>(null);

export function ActingUserProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [actingUserId, setActingUserIdState] = useState(
    () => localStorage.getItem(STORAGE_KEY) ?? "",
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingUserAlert, setActingUserAlert] = useState<string | null>(null);

  const reloadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchUsers();
      setUsers(data);

      if (actingUserId && !data.some((user) => user.id === actingUserId)) {
        localStorage.removeItem(STORAGE_KEY);
        setActingUserIdState("");
      }
    } catch {
      setError("Could not load users — retry.");
    } finally {
      setLoading(false);
    }
  }, [actingUserId]);

  useEffect(() => {
    void reloadUsers();
  }, [reloadUsers]);

  const setActingUserId = useCallback((id: string) => {
    setActingUserIdState(id);
    setActingUserAlert(null);

    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const actingUser = useMemo(
    () => users.find((user) => user.id === actingUserId) ?? null,
    [users, actingUserId],
  );

  const value = useMemo(
    () => ({
      users,
      actingUserId,
      actingUser,
      hasActingUser: Boolean(actingUserId),
      loading,
      error,
      setActingUserId,
      reloadUsers,
      actingUserAlert,
      setActingUserAlert,
    }),
    [
      users,
      actingUserId,
      actingUser,
      loading,
      error,
      setActingUserId,
      reloadUsers,
      actingUserAlert,
    ],
  );

  return (
    <ActingUserContext.Provider value={value}>{children}</ActingUserContext.Provider>
  );
}

export function useActingUser(): ActingUserContextValue {
  const context = useContext(ActingUserContext);

  if (!context) {
    throw new Error("useActingUser must be used within ActingUserProvider");
  }

  return context;
}
