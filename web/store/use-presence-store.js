import { create } from 'zustand';

export const usePresenceStore = create((set) => ({
  users: {}, // Map of email -> { email, role, joinedAt }

  setAllUsers: (users) => set({ users }),

  addUser: (user) => set((state) => ({
    users: {
      ...state.users,
      [user.email]: user
    }
  })),

  removeUser: (email) => set((state) => {
    const newUsers = { ...state.users };
    delete newUsers[email];
    return { users: newUsers };
  }),
}));
