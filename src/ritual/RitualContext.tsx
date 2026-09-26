import React, {
  createContext,
  useContext,
  useMemo,
  useReducer,
} from 'react';

/**
 * Shared state for the morning ritual flow.
 *
 * The four guided steps (Intention -> Priority -> Protect It -> Confirm) all
 * read and write this single piece of state so the user's choices persist as
 * they move forward and back through the flow.
 */
export interface RitualState {
  /** Free-form intention for the day (optional). */
  intention: string;
  /** The one top priority — mandatory before leaving the Priority step. */
  priorityTitle: string;
  /** Duration of the focus block in minutes. Defaults to 50. */
  durationMinutes: number;
  /**
   * Start time of the slot the user placed the priority into, or `null` if no
   * slot has been chosen yet.
   */
  placedSlotStart: Date | null;
  /**
   * Count of completed 25-minute pomodoros the user has run against the top
   * priority on the Today home. Independent of {@link markedDone}.
   */
  pomodoroCount: number;
  /**
   * Whether the user has explicitly marked the top priority as done on the
   * Today home. Independent of the pomodoro timer.
   */
  markedDone: boolean;
  /**
   * Optional minutes the user recorded when marking the priority done, or
   * `null` if they did not enter a value.
   */
  timeSpentMinutes: number | null;
}

/** The default state when the ritual begins. */
export const initialRitualState: RitualState = {
  intention: '',
  priorityTitle: '',
  durationMinutes: 50,
  placedSlotStart: null,
  pomodoroCount: 0,
  markedDone: false,
  timeSpentMinutes: null,
};

type RitualAction =
  | { type: 'setIntention'; value: string }
  | { type: 'setPriorityTitle'; value: string }
  | { type: 'setDurationMinutes'; value: number }
  | { type: 'setPlacedSlotStart'; value: Date | null }
  | { type: 'incrementPomodoro' }
  | { type: 'setMarkedDone'; done: boolean; minutes: number | null }
  | { type: 'reset' };

function ritualReducer(
  state: RitualState,
  action: RitualAction,
): RitualState {
  switch (action.type) {
    case 'setIntention':
      return { ...state, intention: action.value };
    case 'setPriorityTitle':
      return { ...state, priorityTitle: action.value };
    case 'setDurationMinutes':
      return { ...state, durationMinutes: action.value };
    case 'setPlacedSlotStart':
      return { ...state, placedSlotStart: action.value };
    case 'incrementPomodoro':
      return { ...state, pomodoroCount: state.pomodoroCount + 1 };
    case 'setMarkedDone':
      return {
        ...state,
        markedDone: action.done,
        timeSpentMinutes: action.done ? action.minutes : null,
      };
    case 'reset':
      return initialRitualState;
    default:
      return state;
  }
}

export interface RitualContextValue extends RitualState {
  setIntention: (value: string) => void;
  setPriorityTitle: (value: string) => void;
  setDurationMinutes: (value: number) => void;
  setPlacedSlotStart: (value: Date | null) => void;
  /** Record one completed pomodoro against the top priority. */
  incrementPomodoro: () => void;
  /** Mark (or unmark) the priority done, with optional minutes spent. */
  setMarkedDone: (done: boolean, minutes: number | null) => void;
  reset: () => void;
}

const RitualContext = createContext<RitualContextValue | undefined>(undefined);

export function RitualProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const [state, dispatch] = useReducer(ritualReducer, initialRitualState);

  const value = useMemo<RitualContextValue>(
    () => ({
      ...state,
      setIntention: (v) => dispatch({ type: 'setIntention', value: v }),
      setPriorityTitle: (v) =>
        dispatch({ type: 'setPriorityTitle', value: v }),
      setDurationMinutes: (v) =>
        dispatch({ type: 'setDurationMinutes', value: v }),
      setPlacedSlotStart: (v) =>
        dispatch({ type: 'setPlacedSlotStart', value: v }),
      incrementPomodoro: () => dispatch({ type: 'incrementPomodoro' }),
      setMarkedDone: (done, minutes) =>
        dispatch({ type: 'setMarkedDone', done, minutes }),
      reset: () => dispatch({ type: 'reset' }),
    }),
    [state],
  );

  return (
    <RitualContext.Provider value={value}>{children}</RitualContext.Provider>
  );
}

/** Access the ritual state. Must be used within a {@link RitualProvider}. */
export function useRitual(): RitualContextValue {
  const ctx = useContext(RitualContext);
  if (!ctx) {
    throw new Error('useRitual must be used within a RitualProvider');
  }
  return ctx;
}
