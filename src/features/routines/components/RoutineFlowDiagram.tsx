import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { ReactFlow, Position, type Edge, type Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useTranslation } from 'react-i18next';
import type { ThemeTokens } from '../../../core/themes';
import useAccessibility from '../../../core/hooks/useAccessibility';

type RoutineStep = {
  label: string;
  done: boolean;
};

type RoutineFlowDiagramProps = {
  routineTitle: string;
  steps: RoutineStep[];
  anchorHabit?: string | null;
  theme: ThemeTokens;
};

/**
 * A deliberately read-only XYFlow diagram.
 *
 * The actionable checklist remains the semantic source of truth immediately
 * below this visualization. The graph is therefore hidden from assistive
 * technology and from keyboard navigation so it cannot create duplicate or
 * misleading interaction. This keeps XYFlow focused on the relationship it is
 * good at communicating: ordered sequence.
 */
export function RoutineFlowDiagram({
  routineTitle,
  steps,
  anchorHabit,
  theme,
}: RoutineFlowDiagramProps) {
  const { t } = useTranslation();
  const { reduceMotionEnabled, animationsEnabled } = useAccessibility();

  const usableSteps = useMemo(
    () => steps.filter((step) => step.label.trim().length > 0).slice(0, 7),
    [steps]
  );

  const nodes = useMemo<Node[]>(() => {
    const sequence: Array<{ id: string; label: string; done: boolean; anchor?: boolean }> = [];

    if (anchorHabit?.trim()) {
      sequence.push({ id: 'anchor', label: anchorHabit.trim(), done: false, anchor: true });
    }

    usableSteps.forEach((step, index) => {
      sequence.push({
        id: `step-${index}`,
        label: step.label,
        done: step.done,
      });
    });

    return sequence.map((item, index) => ({
      id: item.id,
      position: { x: 0, y: index * 92 },
      data: { label: item.label },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
      draggable: false,
      selectable: false,
      focusable: false,
      style: {
        width: 240,
        minHeight: 52,
        borderRadius: theme.shape.radiusMd,
        border: `1px solid ${item.done ? theme.colors.success : item.anchor ? theme.colors.primary : theme.colors.borderStrong}`,
        background: item.anchor ? theme.colors.overlay : theme.colors.surfaceElevated,
        color: item.done ? theme.colors.muted : theme.colors.text,
        fontFamily: theme.typography.body.family,
        fontSize: 14,
        lineHeight: 1.35,
        padding: '10px 12px',
        textDecoration: item.done ? 'line-through' : 'none',
        overflowWrap: 'anywhere',
        boxShadow: theme.shadow.sm,
      },
    }));
  }, [anchorHabit, theme, usableSteps]);

  const edges = useMemo<Edge[]>(
    () =>
      nodes.slice(1).map((node, index) => ({
        id: `edge-${index}`,
        source: nodes[index].id,
        target: node.id,
        animated: false,
        focusable: false,
        selectable: false,
        style: {
          stroke: theme.colors.borderStrong,
          strokeWidth: 2,
        },
      })),
    [nodes, theme.colors.borderStrong]
  );

  if (usableSteps.length < 2) return null;

  const graphHeight = Math.min(430, Math.max(220, nodes.length * 82));
  const duration = animationsEnabled ? 0.16 : 0;
  const startY = reduceMotionEnabled ? 0 : 4;

  return (
    <details
      style={{
        marginTop: theme.spacing.sm,
        borderTop: `1px solid ${theme.colors.border}`,
        paddingTop: theme.spacing.sm,
      }}
    >
      <summary
        style={{
          minHeight: 44,
          display: 'flex',
          alignItems: 'center',
          color: theme.colors.primary,
          cursor: 'pointer',
          fontWeight: 600,
          fontFamily: theme.typography.body.family,
        }}
      >
        {t('routines.stepsLabel')}
      </summary>

      <motion.figure
        initial={{ opacity: 0, y: startY }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration }}
        style={{
          margin: `${theme.spacing.xs}px 0 ${theme.spacing.sm}px`,
          borderRadius: theme.shape.radiusMd,
          border: `1px solid ${theme.colors.border}`,
          background: theme.colors.background,
          overflow: 'hidden',
        }}
      >
        <figcaption
          style={{
            padding: `${theme.spacing.sm}px ${theme.spacing.md}px 0`,
            color: theme.colors.muted,
            fontSize: '0.8125rem',
            overflowWrap: 'anywhere',
          }}
        >
          {routineTitle} · {t('routines.stepsLabel')}
        </figcaption>

        <div
          aria-hidden="true"
          style={{
            height: graphHeight,
            width: '100%',
            minWidth: 0,
          }}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodesDraggable={false}
            nodesConnectable={false}
            nodesFocusable={false}
            edgesFocusable={false}
            elementsSelectable={false}
            panOnDrag={false}
            zoomOnScroll={false}
            zoomOnPinch={false}
            zoomOnDoubleClick={false}
            preventScrolling={false}
            fitView
            fitViewOptions={{ padding: 0.18, minZoom: 0.62, maxZoom: 1.1 }}
            minZoom={0.62}
            maxZoom={1.1}
          />
        </div>
      </motion.figure>
    </details>
  );
}

export default RoutineFlowDiagram;
