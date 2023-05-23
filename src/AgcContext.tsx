import { createContext } from 'react';
import { Agc } from "./agc/agc"

export const AgcContext = createContext(new Agc());