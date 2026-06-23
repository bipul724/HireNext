import { create } from 'zustand';

export const useEditorStore = create((set) => ({
  // The current text inside the editor
  code: '// Write your code here',
  
  // The current language of the editor
  language: 'javascript',

  // Action to update the code
  setCode: (newCode) => set({ code: newCode }),

  // Action to update the language
  setLanguage: (newLanguage) => set({ language: newLanguage }),


}));
