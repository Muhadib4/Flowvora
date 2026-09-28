import type { FlowvoraData, BoardId, ColumnId, WorkspaceId } from "@/domain/types";
import { selectBoardColumns, selectBoardTasks, selectColumnTasks, selectWorkspaceBoards } from "@/domain/derived";

export const workspaceList = (data: FlowvoraData) => Object.values(data.workspacesById).sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
export const boardList = (data: FlowvoraData) => Object.values(data.boardsById).filter((board) => !board.archivedAt).sort((a, b) => a.position - b.position);
export const boardsForWorkspace = (data: FlowvoraData, id: WorkspaceId) => selectWorkspaceBoards(data, id);
export const columnsForBoard = (data: FlowvoraData, id: BoardId) => selectBoardColumns(data, id);
export const tasksForBoard = (data: FlowvoraData, id: BoardId) => selectBoardTasks(data, id);
export const tasksForColumn = (data: FlowvoraData, id: ColumnId) => selectColumnTasks(data, id);
