import { BoardPage } from "@/features/boards/board-page";

export default async function BoardRoute({ params }: { params: Promise<{ boardId: string }> }) {
  const { boardId } = await params;
  return <BoardPage boardId={boardId} />;
}
