import {
  DragDropContext,
  Draggable,
  Droppable,
  type DraggableStyle,
  type DraggableStateSnapshot,
  type DropResult,
} from "@hello-pangea/dnd";
import { useReducedMotion } from "framer-motion";
import { useMemo } from "react";
import type { Task, TaskStatus, TeamMember } from "../../lib/api";
import { cn } from "../../lib/cn";
import { useMediaQuery } from "../../lib/useMediaQuery";
import { statusLabel, useVibe } from "../../lib/vibe";
import { STATUS_META } from "../ui/StatusPill";
import { TaskCard } from "./TaskCard";

export const COLUMNS: TaskStatus[] = ["todo", "in_progress", "done"];

type Props = {
  tasks: Task[];
  members: TeamMember[];
  busyIds: Set<number>;
  onStatusChange: (taskId: number, status: TaskStatus) => void;
  onReact: (taskId: number, emoji: string) => void;
  onEdit: (task: Task) => void;
};

const EMPTY_HINT: Record<"normal" | "vibe", Record<TaskStatus, string>> = {
  normal: { todo: "nothing here yet", in_progress: "drag something here to start it", done: "nothing finished yet" },
  vibe: { todo: "nothing to dodge yet", in_progress: "drag something here to lock in", done: "nothing eaten yet" },
};

/** Drop animation with a little overshoot so the card "settles". Falls back to dnd's default under reduced motion. */
function dropStyle(style: DraggableStyle | undefined, snapshot: DraggableStateSnapshot, reduce: boolean) {
  if (!snapshot.isDropAnimating || !snapshot.dropAnimation || reduce) return style;
  const { moveTo, duration } = snapshot.dropAnimation;
  return {
    ...style,
    transform: `translate(${moveTo.x}px, ${moveTo.y}px)`,
    transition: `transform ${Math.max(duration, 0.38)}s cubic-bezier(0.34, 1.45, 0.64, 1), box-shadow 0.2s`,
  };
}

export function Board({ tasks, members, busyIds, onStatusChange, onReact, onEdit }: Props) {
  const reduce = useReducedMotion() ?? false;
  const { vibe } = useVibe();
  // On touch screens long-press opens the reaction picker, so dragging is left to the status select.
  const coarse = useMediaQuery("(pointer: coarse)");
  const byId = useMemo(() => new Map(members.map((m) => [m.user_id, m])), [members]);
  const grouped = useMemo(() => {
    const g: Record<TaskStatus, Task[]> = { todo: [], in_progress: [], done: [] };
    for (const t of tasks) g[t.status].push(t);
    return g;
  }, [tasks]);

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    const from = source.droppableId as TaskStatus;
    const to = destination.droppableId as TaskStatus;
    if (from === to) return; // order within a column is by creation; same-column drops are a no-op
    onStatusChange(Number(draggableId), to);
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div
        className={cn(
          "-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4",
          "md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0",
        )}
      >
        {COLUMNS.map((status) => {
          const meta = STATUS_META[status];
          const items = grouped[status];
          return (
            <Droppable droppableId={status} key={status}>
              {(provided, snapshot) => (
                <section
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  aria-label={`${statusLabel(status, vibe)} column`}
                  className={cn(
                    "flex w-[84vw] shrink-0 snap-start flex-col rounded-2xl border border-line bg-bg transition-colors md:w-auto",
                    snapshot.isDraggingOver && "border-accent/60 bg-accent/5",
                  )}
                >
                  <header className="flex items-center justify-between px-4 pb-2 pt-4">
                    <h2 className="font-display text-2xl lowercase leading-none">{statusLabel(status, vibe)}</h2>
                    <span
                      className={cn("inline-flex min-w-[28px] justify-center rounded-full px-2 py-0.5 text-xs font-semibold", meta.className)}
                      aria-label={`${items.length} tasks`}
                    >
                      {items.length}
                    </span>
                  </header>
                  <div className="flex min-h-[120px] flex-1 flex-col gap-3 p-3 pt-1">
                    {items.map((task, index) => (
                      <Draggable draggableId={String(task.id)} index={index} key={task.id} isDragDisabled={coarse || busyIds.has(task.id)}>
                        {(p, snap) => (
                          <div
                            ref={p.innerRef}
                            {...p.draggableProps}
                            {...p.dragHandleProps}
                            style={dropStyle(p.draggableProps.style, snap, reduce)}
                            className="outline-none"
                          >
                            <TaskCard
                              task={task}
                              assignee={task.assignee_id != null ? byId.get(task.assignee_id) : undefined}
                              dragging={snap.isDragging}
                              busy={busyIds.has(task.id)}
                              onStatusChange={(s) => onStatusChange(task.id, s)}
                              onReact={(emoji) => onReact(task.id, emoji)}
                              onEdit={() => onEdit(task)}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {items.length === 0 && !snapshot.isDraggingOver && (
                      <p className="px-1 py-6 text-center text-sm text-muted">
                        {EMPTY_HINT[vibe ? "vibe" : "normal"][status]}
                      </p>
                    )}
                  </div>
                </section>
              )}
            </Droppable>
          );
        })}
      </div>
    </DragDropContext>
  );
}
