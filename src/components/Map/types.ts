import { PositionItem } from '@/types';

export type MapPanelProps = {
  positions: PositionItem[];
  selected?: PositionItem | null;
  popupSelectedId?: string | null;
  onSelect: (item: PositionItem) => void;
};
