/**
 * Mock test data for E2E tests
 */

export const MOCK_USER = {
  id: 'usr_test123',
  upper_id: '',
  username: 'testuser',
  bank_name: 'BCA',
  bank_account: '1234567890',
  bank_account_name: 'Test User',
  phone: '081234567890',
  user_type: 1,
  level: 1,
  level_name: 'Bronze',
  level_exp: '100',
  level_min_exp: '0',
  next_level: 2,
  next_level_name: 'Silver',
  next_level_min_exp: '500',
  currency: 'IDR',
  wallet: '1000000',
  point_wallet: '500',
}

export const MOCK_GAMES = Array.from({ length: 24 }, (_, i) => ({
  id: `GAME_${i + 1}`,
  name: `Test Game ${i + 1}`,
  provider: 'PG Soft',
  game_type: 'slot',
  lobby_id: 'lobby1',
  image: '/lucky/default.png',
  category: i < 12 ? 'hot' : 'new',
}))

export const MOCK_LOBBIES = [
  {
    id: 'lobby1',
    name: 'Main Lobby',
    provider: 'PG Soft',
    image: '/lucky/default.png',
  },
]

export const MOCK_BANK_ACCOUNTS = [
  {
    id: 'bank1',
    account_name: 'Test Account',
    bank: 'BCA',
    code: 'BCA',
    account_number: '9876543210',
  },
]
