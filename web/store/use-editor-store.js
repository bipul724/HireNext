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

  // The live Monaco editor instance, registered on mount so other parts of the
  // app (e.g. Coding Challenge Mode) can focus/reveal it imperatively.
  editor: null,
  setEditor: (editor) => set({ editor }),
}));
