import { createContext, useContext } from 'react';
import { User } from '../lib/auth';

export const UserContext = createContext<User | null>(null);

export const useUser = () => useContext(UserContext);
