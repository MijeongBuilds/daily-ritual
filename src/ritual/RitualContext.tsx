import React, {
  createContext,
  useContext,
  useMemo,
  useReducer,
} from 'react';

/**
 * Shared state for the morning ritual flow.
 *
 * The three guided steps (Intention -> Priority -> Protect It) all read and
 * write this single piece of state so the user's choices persist as they move
 * forward and back through the flow, and the Today home reads from it too.
 */

/**
 * How the priority's protected time is chosen on the Protect It screen. The
 * two modes are mutually exclusive:
 *
 * - `new-block`: the user placed a brand-new focus block on the timeline
 *   (see {@link RitualState.placedSlotStart}).
 * - `existing-event`: the user tapped an existing calendar event (a meeting
 *   or an already-scheduled focus block) and designated THAT event as today's
 *   protected top-priority time — no new block is created.
 */
export type ProtectMode = 'new-block' | 'existing-event';

/** A reflection note the user saved when a task was not accomplished. */
export interface ReflectionNote {
  /** The priority the note was about. */
  priorityTitle: string;
  /** Free-form note: "what will you do with this?". */
  note: string;
  /** When the note was captured (ms since epoch). */
  createdAt: number;
}

export interface RitualState {
  /** Free-form intention for the day (optional). */
  intention: string;
  /** The one top priority — mandatory before leaving the Priority step. */
  priorityTitle: string;
  /** Duration of the focus block in minutes. Defaults to 50. */
  durationMinutes: number;
  /**
   * Start time of the new focus block the user placed on the timeline, or
   * `null` if none. Only meaningful when {@link protectMode} is `new-block`.
   */
  placedSlotStart: Date | null;
  /**
   * The existing calendar event the user designated as their protected time,
   * or `null`. Only meaningful when {@link protectMode} is `existing-event`.
   */
  existingEventId: string | null;
  /** Start time of the chosen existing event (for display). */
  existingEventStart: Date | null;
  /** End time of the chosen existing event (for display). */
  existingEventEnd: Date | null;
  /**
   * Which protection mode is active, or `null` if nothing is protected yet.
   * Kept in sync so the two modes are always mutually exclusive.
   */
  protectMode: ProtectMode | null;
  /**
   * Whether the user has explicitly marked the top priority as done on the
   * Today home.
   */
  markedDone: boolean;
  /**
   * Optional minutes the user recorded as the actual time the priority took,
   * or `null` if they did not enter a value. Set either from the "Done"
   * popup or whenever the timer is stopped (time is logged regardless of
   * whether the task was accomplished).
   */
  timeSpentMinutes: number | null;
  /**
   * Total focus seconds accrued for the priority across timer sessions. The
   * count-up timer seeds itself from this so re-entering it CONTINUES from the
   * previously-accumulated time rather than restarting at 0:00. Stopping the
   * timer writes the new total back here.
   */
  accumulatedFocusSeconds: number;
  /** Reflection notes captured when a task was not accomplished. */
  reflections: ReflectionNote[];
}

/** The default state when the ritual begins. */
export const initialRitualState: RitualState = {
  intention: '',
  priorityTitle: '',
  durationMinutes: 50,
  placedSlotStart: null,
  existingEventId: null,
  existingEventStart: null,
  existingEventEnd: null,
  protectMode: null,
  markedDone: false,
  timeSpentMinutes: null,
  accumulatedFocusSeconds: 0,
  reflections: [],
};

type RitualAction =
  | { type: 'setIntention'; value: string }
  | { type: 'setPriorityTitle'; value: string }
  | { type: 'setDurationMinutes'; value: number }
  | { type: 'placeNewBlock'; start: Date | null }
  | { type: 'useExistingEvent'; id: string; start: Date; end: Date }
  | { type: 'clearProtection' }
  | { type: 'setMarkedDone'; done: boolean; minutes: number | null }
  | { type: 'saveFocusTime'; totalSeconds: number }
  | { type: 'addReflection'; note: ReflectionNote }
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
    case 'placeNewBlock':
      // Placing a new block is mutually exclusive with choosing an event.
      if (action.start == null) {
        return {
          ...state,
          placedSlotStart: null,
          protectMode:
            state.protectMode === 'new-block' ? null : state.protectMode,
        };
      }
      return {
        ...state,
        placedSlotStart: action.start,
        protectMode: 'new-block',
        existingEventId: null,
        existingEventStart: null,
        existingEventEnd: null,
      };
    case 'useExistingEvent':
      // Choosing an existing event clears any new-block placement.
      return {
        ...state,
        existingEventId: action.id,
        existingEventStart: action.start,
        existingEventEnd: action.end,
        protectMode: 'existing-event',
        placedSlotStart: null,
      };
    case 'clearProtection':
      return {
        ...state,
        placedSlotStart: null,
        existingEventId: null,
        existingEventStart: null,
        existingEventEnd: null,
        protectMode: null,
      };
    case 'setMarkedDone': {
      if (!action.done) {
        // Unchecking clears the done state. Keep any accumulated focus time
        // (the user still spent it) so a resumed timer continues from it.
        return { ...state, markedDone: false };
      }
      // Marking done. A non-null minutes value (typed in the popup) overrides
      // the logged time and keeps the accumulated focus total in sync so a
      // resumed timer continues from it. A null value means "no explicit time"
      // — keep whatever was already logged (e.g. from the timer on Stop).
      if (action.minutes != null && action.minutes > 0) {
        return {
          ...state,
          markedDone: true,
          timeSpentMinutes: action.minutes,
          accumulatedFocusSeconds: action.minutes * 60,
        };
      }
      return { ...state, markedDone: true };
    }
    case 'saveFocusTime':
      // Always record the timer's time — this is the source of truth for
      // resume, and it also surfaces as time spent on the priority card.
      return {
        ...state,
        accumulatedFocusSeconds: Math.max(Math.floor(action.totalSeconds), 0),
        timeSpentMinutes: Math.round(
          Math.max(Math.floor(action.totalSeconds), 0) / 60,
        ),
      };
    case 'addReflection':
      return { ...state, reflections: [...state.reflections, action.note] };
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
  /** Place (or clear, with `null`) a new focus block at the given start. */
  placeNewBlock: (start: Date | null) => void;
  /** Designate an existing calendar event as the protected time. */
  protectExistingEvent: (id: string, start: Date, end: Date) => void;
  /** Clear whichever protection is active (nothing selected). */
  clearProtection: () => void;
  /** Mark (or unmark) the priority done, with optional minutes spent. */
  setMarkedDone: (done: boolean, minutes: number | null) => void;
  /**
   * Persist the total focus seconds from the timer. Called on Stop so the
   * time is always logged (whether or not the task was accomplished) and so
   * re-entering the timer resumes from this total.
   */
  saveFocusTime: (totalSeconds: number) => void;
  /** Save a reflection note (task not accomplished). */
  addReflection: (note: ReflectionNote) => void;
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
      placeNewBlock: (start) => dispatch({ type: 'placeNewBlock', start }),
      protectExistingEvent: (id, start, end) =>
        dispatch({ type: 'useExistingEvent', id, start, end }),
      clearProtection: () => dispatch({ type: 'clearProtection' }),
      setMarkedDone: (done, minutes) =>
        dispatch({ type: 'setMarkedDone', done, minutes }),
      saveFocusTime: (totalSeconds) =>
        dispatch({ type: 'saveFocusTime', totalSeconds }),
      addReflection: (note) => dispatch({ type: 'addReflection', note }),
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
