/* ══════════════════════════════════════════════
   animal-island-ui Type Declarations
   ══════════════════════════════════════════════ */
declare module "animal-island-ui/style" {
  const _: string;
  export default _;
}

declare module "animal-island-ui" {
  import type { FC, ReactNode, ButtonHTMLAttributes, HTMLAttributes } from "react";

  // ── Button ──
  export type ButtonType = "primary" | "default" | "dashed" | "text" | "link";
  export type ButtonSize = "small" | "middle" | "large";
  export type ButtonHTMLType = "submit" | "reset" | "button";

  export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
    type?: ButtonType;
    size?: ButtonSize;
    danger?: boolean;
    ghost?: boolean;
    block?: boolean;
    loading?: boolean;
    icon?: ReactNode;
    htmlType?: ButtonHTMLType;
    children?: ReactNode;
  }
  export const Button: FC<ButtonProps>;

  // ── Input ──
  export type InputSize = "small" | "middle" | "large";
  export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size" | "prefix"> {
    size?: InputSize;
    prefix?: ReactNode;
    suffix?: ReactNode;
    allowClear?: boolean;
    status?: "error" | "warning";
    shadow?: boolean;
    onClear?: () => void;
  }
  export const Input: FC<InputProps>;

  // ── Select ──
  export type SelectOption = { key: string; label: string };
  export interface SelectProps {
    options: SelectOption[];
    value: string;
    onChange: (key: string) => void;
    placeholder?: string;
    disabled?: boolean;
  }
  export const Select: FC<SelectProps>;

  // ── Modal ──
  export interface ModalProps {
    open: boolean;
    title?: ReactNode;
    width?: number | string;
    maskClosable?: boolean;
    footer?: ReactNode | null;
    onClose?: () => void;
    onOk?: () => void;
    children?: ReactNode;
    className?: string;
    typeSpeed?: number;
    typewriter?: boolean;
  }
  export const Modal: FC<ModalProps>;

  // ── Card ──
  export type CardType = "default" | "title" | "dashed";
  export type CardColor =
    | "default" | "app-pink" | "purple" | "app-blue" | "app-yellow"
    | "app-orange" | "app-teal" | "app-green" | "app-red"
    | "lime-green" | "yellow-green" | "brown" | "warm-peach-pink";
  export interface CardProps extends HTMLAttributes<HTMLDivElement> {
    type?: CardType;
    color?: CardColor;
    children?: ReactNode;
  }
  export const Card: FC<CardProps>;

  // ── Collapse ──
  export interface CollapseProps {
    question: ReactNode;
    answer: ReactNode;
    defaultExpanded?: boolean;
    disabled?: boolean;
    className?: string;
    style?: React.CSSProperties;
  }
  export const Collapse: FC<CollapseProps>;

  // ── Tabs ──
  export interface TabItem {
    key: string;
    label: ReactNode;
    children: ReactNode;
  }
  export interface TabsProps {
    items: TabItem[];
    defaultActiveKey?: string;
    activeKey?: string;
    onChange?: (key: string) => void;
    className?: string;
    style?: React.CSSProperties;
    leafAnimation?: boolean;
    shadow?: boolean;
  }
  export const Tabs: FC<TabsProps>;

  // ── Table ──
  export interface TableColumn<T = Record<string, unknown>> {
    title: ReactNode;
    dataIndex?: keyof T;
    render?: (value: unknown, record: T, index: number) => ReactNode;
    width?: string | number;
    align?: "left" | "center" | "right";
    fixed?: "left" | "right";
    style?: React.CSSProperties;
  }
  export interface TableProps {
    columns?: TableColumn[];
    dataSource?: Record<string, unknown>[];
    rowKey?: string | ((record: Record<string, unknown>) => string);
    striped?: boolean;
    showHeader?: boolean;
    rowClassName?: string | ((record: Record<string, unknown>, index: number) => string);
    onRow?: (record: Record<string, unknown>, index: number) => HTMLAttributes<HTMLTableRowElement>;
    loading?: boolean;
    emptyText?: ReactNode;
    scroll?: { x?: number | string; y?: number | string };
    className?: string;
    style?: React.CSSProperties;
  }
  export const Table: FC<TableProps>;

  // ── Loading ──
  export interface LoadingProps {
    className?: string;
    style?: React.CSSProperties;
    active?: boolean;
  }
  export const Loading: FC<LoadingProps>;

  // ── Icon ──
  export type IconName =
    | "icon-miles" | "icon-camera" | "icon-chat" | "icon-critterpedia"
    | "icon-design" | "icon-diy" | "icon-helicopter" | "icon-map"
    | "icon-shopping" | "icon-variant";
  export interface IconProps {
    name: IconName;
    size?: number | string;
    className?: string;
    style?: React.CSSProperties;
    bounce?: boolean;
  }
  export const Icon: FC<IconProps>;

  // ── Typewriter ──
  export interface TypewriterProps {
    children?: ReactNode;
    speed?: number;
    trigger?: unknown;
    autoPlay?: boolean;
    onDone?: () => void;
  }
  export const Typewriter: FC<TypewriterProps>;

  // ── Divider ──
  export type DividerType = "line-brown" | "line-teal" | "line-white" | "line-yellow" | "wave-yellow";
  export interface DividerProps {
    type?: DividerType;
    className?: string;
    style?: React.CSSProperties;
  }
  export const Divider: FC<DividerProps>;
}
