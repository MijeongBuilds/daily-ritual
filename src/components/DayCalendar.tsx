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
/** Left column width reserved for the hour labels. */
const GUTTER_WIDTH = 56;

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
  fittingGaps: TimeGap[];
  /** The base date used to anchor the timeline (defaults to now). */
  day?: Date;
  /** The chosen focus block, if the user has placed one. */
  placedStart: Date | null;
  placedDurationMinutes: number;
  priorityTitle: string;
  /** Called with the start Date of a tapped highlighted gap. */
  onPlaceSlot: (start: Date) => void;
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
 * A vertical day timeline. Existing events render at their proportional
 * positions and stay visible; free gaps that fit the chosen duration render
 * as highlighted, tappable slots (approach A). The placed focus block renders
 * distinctly in the accent color and may overlap existing events.
 */
export function DayCalendar({
  events,
  fittingGaps,
  day = new Date(),
  placedStart,
  placedDurationMinutes,
  priorityTitle,
  onPlaceSlot,
}: DayCalendarProps): React.ReactElement {
  const base = dayStartDate(day);
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

  function handleTimelinePress(e: GestureResponderEvent): void {
    // Center the block on the tap point, then clamp to the visible window.
    const y =
      e.nativeEvent.locationY - (placedDurationMinutes * PIXELS_PER_MINUTE) / 2;
    onPlaceSlot(timeForOffset(y, placedDurationMinutes, base));
  }

  return (
    <View style={styles.wrapper}>
      <Pressable
        style={[styles.timeline, { height: TIMELINE_HEIGHT }]}
        onPress={handleTimelinePress}
        accessibilityRole="adjustable"
        accessibilityLabel="Day timeline. Tap anywhere to place your focus block at that time. Overlap is allowed."
      >
        {/* Hour grid lines + labels */}
        {hours.map((h) => {
          const top = (h - DAY_START_HOUR) * PIXELS_PER_HOUR;
          const labelDate = new Date(base);
          labelDate.setHours(h, 0, 0, 0);
          return (
            <View key={`hour-${h}`} style={[styles.hourRow, { top }]}>
              <Text style={styles.hourLabel}>{formatTime(labelDate)}</Text>
              <View style={styles.hourLine} />
            </View>
          );
        })}

        {/* Highlighted fitting gaps (tappable) */}
        {fittingGaps.map((gap, idx) => {
          const top = offsetForTime(gap.start, base);
          const height = Math.max(
            gap.durationMinutes * PIXELS_PER_MINUTE,
            24,
          );
          return (
            <Pressable
              key={`gap-${idx}`}
              accessibilityRole="button"
              accessibilityLabel={`Free slot ${formatTimeRange(
                gap.start,
                gap.end,
              )}. Tap to place your priority here.`}
              onPress={(e) => {
                // Suggested easy path: snap to the free gap's start.
                e.stopPropagation();
                onPlaceSlot(clampStartToTimeline(gap.start, placedDurationMinutes, base));
              }}
              style={[styles.gap, { top, height }]}
            >
              <Text style={styles.gapLabel} numberOfLines={1}>
                {`Free · tap to protect`}
              </Text>
            </Pressable>
          );
        })}

        {/* Existing events */}
        {events.map((event) => {
          const top = offsetForTime(event.start, base);
          const height = Math.max(
            offsetForTime(event.end, base) - top,
            22,
          );
          return (
            <View
              key={event.id}
              pointerEvents="none"
              style={[
                styles.event,
                {
                  top,
                  height,
                  backgroundColor: event.color ?? theme.colors.textMuted,
                },
              ]}
            >
              <Text style={styles.eventTitle} numberOfLines={1}>
                {event.title}
              </Text>
              <Text style={styles.eventTime} numberOfLines={1}>
                {formatTimeRange(event.start, event.end)}
              </Text>
            </View>
          );
        })}

        {/* Placed focus block (accent, may overlap) — clamped to the window */}
        {placedStart != null && placedEnd != null && (
          <View
            pointerEvents="none"
            style={[
              styles.placed,
              {
                top: placedTop,
                height: placedHeight,
              },
            ]}
          >
            <Text style={styles.placedTitle} numberOfLines={1}>
              {priorityTitle || 'Focus block'}
            </Text>
            <Text style={styles.placedTime} numberOfLines={1}>
              {formatTimeRange(placedStart, placedEnd)}
            </Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
  },
  timeline: {
    flex: 1,
    position: 'relative',
  },
  hourRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  hourLabel: {
    ...theme.typography.caption,
    width: GUTTER_WIDTH,
    fontSize: theme.fontSizes.xs,
  },
  hourLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border,
  },
  gap: {
    position: 'absolute',
    left: GUTTER_WIDTH,
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
    left: GUTTER_WIDTH + theme.spacing.sm,
    right: theme.spacing.sm,
    borderRadius: theme.radii.button,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    justifyContent: 'center',
    opacity: 0.85,
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
    left: GUTTER_WIDTH,
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
});
