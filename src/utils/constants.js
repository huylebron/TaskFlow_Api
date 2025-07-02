/**
 * Updated by trungquandev.com's author on August 17 2023
 * YouTube: https://youtube.com/@trungquandev
 * "A bit of fragrance clings to the hand that gives flowers!"
 */
import { env } from '~/config/environment'

// Những domain được phép truy cập tới tài nguyên của Server
export const WHITELIST_DOMAINS = [
  // 'http://localhost:5173' // Không cần localhost nữa vì ở file config/cors đã luôn luôn cho phép môi trường dev (env.BUILD_MODE === 'dev')

  // Lưu ý: Đây là domain ví dụ sau khi Deploy Production (xem video 75 và video 76 để hiểu rõ kiến thức phần này, còn hiện tại mình đã xóa domain này rồi, đừng cố truy cập làm gì =))
  'https://trello-web-mu.vercel.app'
]

export const BOARD_TYPES = {
  PUBLIC: 'public',
  PRIVATE: 'private'
}

export const WEBSITE_DOMAIN = (env.BUILD_MODE === 'production') ? env.WEBSITE_DOMAIN_PRODUCTION : env.WEBSITE_DOMAIN_DEVELOPMENT

export const DEFAULT_PAGE = 1
export const DEFAULT_ITEMS_PER_PAGE = 12

export const INVITATION_TYPES = {
  BOARD_INVITATION: 'BOARD_INVITATION'
}
export const BOARD_INVITATION_STATUS = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED'
}

export const CARD_MEMBER_ACTIONS = {
  ADD: 'ADD',
  REMOVE: 'REMOVE'
}

// Card cover colors và gradients
export const CARD_COVER_COLORS = {
  BLUE: '#0079bf',
  ORANGE: '#d29034',
  GREEN: '#519839',
  RED: '#b04632',
  PURPLE: '#89609e',
  PINK: '#cd5a91',
  LIME: '#4bbf6b',
  SKY: '#00aecc',
  GREY: '#838c91',
  NAVY: '#172b4d'
}

export const CARD_COVER_GRADIENTS = {
  GRADIENT_1: 'linear-gradient(to right, #00c6ff, #0072ff)',
  GRADIENT_2: 'linear-gradient(to right, #f857a6, #ff5858)',
  GRADIENT_3: 'linear-gradient(to right, #4facfe, #00f2fe)',
  GRADIENT_4: 'linear-gradient(to right, #43e97b, #38f9d7)',
  GRADIENT_5: 'linear-gradient(to right, #fa709a, #fee140)'
}

// Column colors - 20 màu cố định hài hòa với UI
export const COLUMN_COLORS = {
  BLUE: '#0079bf',
  LIGHT_BLUE: '#54a3ff',
  OCEAN: '#026aa7',
  ORANGE: '#d29034',
  PEACH: '#ffab4a',
  AMBER: '#ff8f00',
  GREEN: '#519839',
  LIME: '#4bbf6b',
  FOREST: '#2d5016',
  RED: '#b04632',
  CRIMSON: '#eb5a46',
  CHERRY: '#c9372c',
  PURPLE: '#89609e',
  VIOLET: '#9c27b0',
  INDIGO: '#6366f1',
  PINK: '#cd5a91',
  ROSE: '#e91e63',
  MAGENTA: '#e040fb',
  GREY: '#838c91',
  DARK_GREY: '#4f4f4f',
  NAVY: '#172b4d',
  TEAL: '#00897b',
  CYAN: '#00bcd4',
  YELLOW: '#f9c74f'
}

export const BOARD_MEMBER_ROLES = {
  ADMIN: 'admin',
  MEMBER: 'member'
}
