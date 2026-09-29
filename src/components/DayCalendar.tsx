import React from 'react';
import {
  GestureResponderEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { CalendarEvent, TimeGap } from '../services/calendar/types';
import theme from '../theme/theme';
import { formatTime, formatTimeRange } from './formatTime';

/** Hour the timeline starts (7:00 AM). */
export const DAY_START_HOUR = 7;
/** Hour the timeline ends (9:00 PM). */
export const DAY_END_HOUR = 21;
/** Vertical pixels per hour. */
const PIXELS_PER_HOUR = 64;
const PIXELS_PER_MINUTE = PIXELS_PER_HOUR / 60;
/** Placed blocks snap to this granularity (minutes) when tapping the timeline. */
const SNAP_MINUTES = 5;

const TOTAL_MINUTES = (DAY_END_HOUR - DAY_START_HOUR) * 60;
const TIMELINE_HEIGHT = TOTAL_MINUTES * PIXELS_PER_MINUTE;
/** Left column width reserved for the hour labels (the "gutter"). */
const GUTTER_WIDTH = 56;
/** Small gap between the gutter and the event lane. */
const LANE_INSET = theme.spacing.sm;

/**
 * Clamp a start time so a block of `durationMinutes` stays inside the visible
 * 7:00–21:00 window. Returns a Date no earlier than the day start and no later
 * than (day end - duration).
 */
export function clampStartToTimeline(
  start: Date,
  durationMinutes: number,
  base: Date,
): Date {
  const latestStartMinutes = Math.max(
    0,
    TOTAL_MINUTES - Math.max(durationMinutes, 0),
  );
  const rawMinutes = (start.getTime() - base.getTime()) / 60_000;
  const clamped = Math.min(Math.max(rawMinutes, 0), latestStartMinutes);
  return new Date(base.getTime() + clamped * 60_000);
}

export interface DayCalendarProps {
  events: CalendarEvent[];
  /** Free gaps that FIT the chosen duration; rendered as tappable highlights. */
  fittingGaps?: TimeGap[];
  /** The base date used to anchor the timeline (defaults to now). */
  day?: Date;
  /** The chosen focus block, if the user has placed one. */
  placedStart?: Date | null;
  placedDurationMinutes?: number;
  priorityTitle?: string;
  /**
   * The id of an existing event the user has designated as their protected
   * time. When set, that event renders distinctly (as the protected block).
   */
  selectedEventId?: string | null;
  /**
   * Called with the start Date of a tapped highlighted gap or timeline tap.
   * When omitted the calendar is read-only (used on the Today home) — no gaps
   * are tappable and the timeline does not respond to taps.
   */
  onPlaceSlot?: (start: Date) => void;
  /**
   * Called when the user taps the currently-placed focus block to UN-SELECT
   * it (clear the placement). Only wired when interactive.
   */
  onClearPlaced?: () => void;
  /**
   * Called when the user taps an existing calendar event, to designate it as
   * their protected top-priority time. Only wired when interactive.
   */
  onSelectEvent?: (event: CalendarEvent) => void;
  /**
   * Show a horizontal "now" indicator line at the current time (used on the
   * Today home). Defaults to false.
   */
  showNowIndicator?: boolean;
}

function dayStartDate(day: Date): Date {
  const d = new Date(day);
  d.setHours(DAY_START_HOUR, 0, 0, 0);
  return d;
}

/** Vertical offset (px) from the top of the timeline for a given time. */
function offsetForTime(time: Date, base: Date): number {
  const minutes = (time.getTime() - base.getTime()) / 60_000;
  return minutes * PIXELS_PER_MINUTE;
}

/**
 * Map a vertical tap position (px from the top of the timeline) to a snapped
 * start time, clamped so a block of `durationMinutes` stays fully inside the
 * visible window.
 */
export function timeForOffset(
  offsetPx: number,
  durationMinutes: number,
  base: Date,
): Date {
  const rawMinutes = offsetPx / PIXELS_PER_MINUTE;
  const snapped = Math.round(rawMinutes / SNAP_MINUTES) * SNAP_MINUTES;
  const start = new Date(base.getTime() + snapped * 60_000);
  return clampStartToTimeline(start, durationMinutes, base);
}

/**
 * Given a tap Y-position INSIDE a free gap (px from the gap's own top), return
 * the snapped start time for a block placed at that point, clamped so the
 * block stays within the gap. This lets the user drop a 30-min block at, say,
 * 10:00 inside a 9:30–11:00 gap instead of always snapping to the gap start.
 */
export function startWithinGap(
  gap: TimeGap,
  tapOffsetInGapPx: number,
  durationMinutes: number,
  base: Date,
): Date {
  const gapStartMin = (gap.start.getTime() - base.getTime()) / 60_000;
  const tapMin = tapOffsetInGapPx / PIXELS_PER_MINUTE;
  const rawMin = gapStartMin + tapMin;
  const snapped = Math.round(rawMin / SNAP_MINUTES) * SNAP_MINUTES;
  // Keep the block fully inside the gap: no earlier than the gap start, no
  // later than (gap end - duration).
  const gapEndMin = (gap.end.getTime() - base.getTime()) / 60_000;
  const latestStart = Math.max(gapStartMin, gapEndMin - durationMinutes);
  const clampedMin = Math.min(Math.max(snapped, gapStartMin), latestStart);
  const start = new Date(base.getTime() + clampedMin * 60_000);
  return clampStartToTimeline(start, durationMinutes, base);
}

/**
 * A standard day-view calendar (Google-Calendar mobile style): an HOUR GUTTER
 * on the LEFT with hour labels (8 AM, 9 AM, ...) and an event lane on the
 * right where events and free-gap slots are positioned against the hour grid
 * by their start/end times.
 *
 * When `onPlaceSlot` is provided the calendar is INTERACTIVE (used on the
 * Protect It screen): fitting gaps highlight as tappable slots (tap at the
 * point you want the block), tapping anywhere on the timeline places the
 * focus block (overlap allowed), tapping the placed block again clears it,
 * and tapping an existing event designates it as the protected time. When
 * `onPlaceSlot` is omitted the calendar is READ-ONLY (used on the Today home)
 * and can show a "now" indicator line via `showNowIndicator`.
 */
export function DayCalendar({
  events,
  fittingGaps = [],
  day = new Date(),
  placedStart = null,
  placedDurationMinutes = 0,
  priorityTitle = '',
  selectedEventId = null,
  onPlaceSlot,
  onClearPlaced,
  onSelectEvent,
  showNowIndicator = false,
}: DayCalendarProps): React.ReactElement {
  const base = dayStartDate(day);
  const interactive = onPlaceSlot != null;
  const hours = Array.from(
    { length: DAY_END_HOUR - DAY_START_HOUR + 1 },
    (_, i) => DAY_START_HOUR + i,
  );

  const placedEnd =
    placedStart != null
      ? new Date(placedStart.getTime() + placedDurationMinutes * 60_000)
      : null;

  // Clamp the rendered placed block to the visible window so it never draws
  // below the timeline (a late start + long duration would otherwise spill).
  const placedTop =
    placedStart != null
      ? Math.min(offsetForTime(placedStart, base), TIMELINE_HEIGHT - 28)
      : 0;
  const placedHeight =
    placedStart != null
      ? Math.max(
          Math.min(
            placedDurationMinutes * PIXELS_PER_MINUTE,
            TIMELINE_HEIGHT - placedTop,
          ),
          28,
        )
      : 0;

  // "Now" indicator position — only shown when the current time falls inside
  // the visible window.
  const now = day;
  const nowOffset = offsetForTime(now, base);
  const nowVisible =
    showNowIndicator && nowOffset >= 0 && nowOffset <= TIMELINE_HEIGHT;

  function handleTimelinePress(e: GestureResponderEvent): void {
    if (onPlaceSlot == null) {
      return;
    }
    // Place the block so it STARTS at the tapped time (snapped), then clamp to
    // the visible window.
    const y = e.nativeEvent.locationY;
    onPlaceSlot(timeForOffset(y, placedDurationMinutes, base));
  }

  const timelineBody = (
    <>
      {/* Hour grid lines (in the event lane, to the right of the gutter) */}
      {hours.map((h) => {
        const top = (h - DAY_START_HOUR) * PIXELS_PER_HOUR;
        return <View key={`line-${h}`} style={[styles.hourLine, { top }]} />;
      })}

      {/* Highlighted fitting gaps (tappable — place at the tapped point) */}
      {fittingGaps.map((gap, idx) => {
        const top = offsetForTime(gap.start, base);
        const height = Math.max(gap.durationMinutes * PIXELS_PER_MINUTE, 24);
        return (
          <Pressable
            key={`gap-${idx}`}
            accessibilityRole="button"
            accessibilityLabel={`Free slot ${formatTimeRange(
              gap.start,
              gap.end,
            )}. Tap where you want your priority to start.`}
            onPress={(e) => {
              // Place the block at the tapped point WITHIN the gap so the user
              // can pick, e.g., 10:00 inside a 9:30–11:00 gap.
              e.stopPropagation();
              onPlaceSlot?.(
                startWithinGap(
                  gap,
                  e.nativeEvent.locationY,
                  placedDurationMinutes,
                  base,
                ),
              );
            }}
            style={[styles.gap, { top, height }]}
          >
            <Text style={styles.gapLabel} numberOfLines={1}>
              {`Free · tap to protect`}
            </Text>
          </Pressable>
        );
      })}

      {/* Existing events (tappable when interactive: designate as protected) */}
      {events.map((event) => {
        const top = offsetForTime(event.start, base);
        const height = Math.max(offsetForTime(event.end, base) - top, 22);
        const isSelected = selectedEventId != null && event.id === selectedEventId;
        const eventStyle = [
          styles.event,
          {
            top,
            height,
            backgroundColor: isSelected
              ? theme.colors.accent
              : event.color ?? theme.colors.textMuted,
          },
          isSelected && styles.eventSelected,
        ];
        const body = (
          <>
            <Text style={styles.eventTitle} numberOfLines={1}>
              {isSelected ? `★ ${event.title}` : event.title}
            </Text>
            <Text style={styles.eventTime} numberOfLines={1}>
              {formatTimeRange(event.start, event.end)}
            </Text>
          </>
        );
        if (interactive && onSelectEvent != null) {
          return (
            <Pressable
              key={event.id}
              accessibilityRole="button"
              accessibilityLabel={`${event.title}, ${formatTimeRange(
                event.start,
                event.end,
              )}. Tap to use this event as your protected focus time.`}
              onPress={(e) => {
                e.stopPropagation();
                onSelectEvent(event);
              }}
              style={eventStyle}
            >
              {body}
            </Pressable>
          );
        }
        return (
          <View key={event.id} pointerEvents="none" style={eventStyle}>
            {body}
          </View>
        );
      })}

      {/* Placed focus block (accent, may overlap) — clamped to the window.
          When interactive, tapping it again clears the placement. */}
      {placedStart != null &&
        placedEnd != null &&
        (interactive && onClearPlaced != null ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Focus block ${formatTimeRange(
              placedStart,
              placedEnd,
            )}. Tap to remove it.`}
            onPress={(e) => {
              e.stopPropagation();
              onClearPlaced();
            }}
            style={[styles.placed, { top: placedTop, height: placedHeight }]}
          >
            <Text style={styles.placedTitle} numberOfLines={1}>
              {priorityTitle || 'Focus block'}
            </Text>
            <Text style={styles.placedTime} numberOfLines={1}>
              {`${formatTimeRange(placedStart, placedEnd)} · tap to remove`}
            </Text>
          </Pressable>
        ) : (
          <View
            pointerEvents="none"
            style={[styles.placed, { top: placedTop, height: placedHeight }]}
          >
            <Text style={styles.placedTitle} numberOfLines={1}>
              {priorityTitle || 'Focus block'}
            </Text>
            <Text style={styles.placedTime} numberOfLines={1}>
              {formatTimeRange(placedStart, placedEnd)}
            </Text>
          </View>
        ))}

      {/* Current-time "now" indicator */}
      {nowVisible && (
        <View
          pointerEvents="none"
          style={[styles.nowLine, { top: nowOffset }]}
        >
          <View style={styles.nowDot} />
          <View style={styles.nowRule} />
        </View>
      )}
    </>
  );

  return (
    <View style={styles.wrapper}>
      {/* LEFT: hour gutter with labels aligned to each grid line. */}
      <View style={[styles.gutter, { height: TIMELINE_HEIGHT }]}>
        {hours.map((h) => {
          const top = (h - DAY_START_HOUR) * PIXELS_PER_HOUR;
          const labelDate = new Date(base);
          labelDate.setHours(h, 0, 0, 0);
          return (
            <Text key={`label-${h}`} style={[styles.hourLabel, { top }]}>
              {formatTime(labelDate)}
            </Text>
          );
        })}
      </View>

      {/* RIGHT: the event lane / timeline. */}
      {interactive ? (
        <Pressable
          style={[styles.lane, { height: TIMELINE_HEIGHT }]}
          onPress={handleTimelinePress}
          accessibilityRole="adjustable"
          accessibilityLabel="Day timeline. Tap anywhere to place your focus block starting at that time. Overlap is allowed."
        >
          {timelineBody}
        </Pressable>
      ) : (
        <View style={[styles.lane, { height: TIMELINE_HEIGHT }]}>
          {timelineBody}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
  },
  gutter: {
    width: GUTTER_WIDTH,
    position: 'relative',
  },
  hourLabel: {
    ...theme.typography.caption,
    fontSize: theme.fontSizes.xs,
    position: 'absolute',
    right: theme.spacing.sm,
    // Nudge the label up so its baseline sits on the grid line.
    top: 0,
    marginTop: -7,
    textAlign: 'right',
  },
  lane: {
    flex: 1,
    position: 'relative',
    marginLeft: LANE_INSET,
  },
  hourLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border,
  },
  gap: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: theme.colors.highlight,
    borderWidth: 1,
    borderColor: theme.colors.highlightBorder,
    borderStyle: 'dashed',
    borderRadius: theme.radii.button,
    paddingHorizontal: theme.spacing.sm,
    justifyContent: 'center',
  },
  gapLabel: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontFamily: theme.fonts.sansSemiBold,
  },
  event: {
    position: 'absolute',
    left: theme.spacing.sm,
    right: theme.spacing.sm,
    borderRadius: theme.radii.button,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    justifyContent: 'center',
    opacity: 0.85,
  },
  eventSelected: {
    opacity: 1,
    borderWidth: 2,
    borderColor: theme.colors.primaryDark,
    ...theme.shadows.soft,
  },
  eventTitle: {
    ...theme.typography.caption,
    color: theme.colors.onPrimary,
    fontFamily: theme.fonts.sansSemiBold,
  },
  eventTime: {
    ...theme.typography.caption,
    color: theme.colors.onPrimary,
    fontSize: theme.fontSizes.xs,
    opacity: 0.9,
  },
  placed: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radii.button,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    justifyContent: 'center',
    ...theme.shadows.soft,
  },
  placedTitle: {
    ...theme.typography.caption,
    color: theme.colors.onPrimary,
    fontFamily: theme.fonts.sansBold,
  },
  placedTime: {
    ...theme.typography.caption,
    color: theme.colors.onPrimary,
    fontSize: theme.fontSizes.xs,
    opacity: 0.95,
  },
  nowLine: {
    position: 'absolute',
    left: -4,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  nowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.accent,
  },
  nowRule: {
    flex: 1,
    height: 2,
    backgroundColor: theme.colors.accent,
  },
});
