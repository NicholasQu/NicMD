export interface WechatTheme {
  name: string
  text: string
  textSoft: string
  muted: string
  muted2: string
  surface: string
  surfaceSoft: string
  border: string
  borderSoft: string
  accent: string
  accent2: string
  accentText: string
  accentSoft: string
  accentSofter: string
  accentBorder: string
  accentLine: string
  codeBg: string
  codeText: string
  codeHeaderBg: string
  codeBorder: string
  shadow: string
  softShadow: string
}

export const WECHAT_THEMES = {
  appleOrange: {
    name: 'apple-orange',
    text: '#1d1d1f',
    textSoft: '#3a3a3c',
    muted: '#6e6e73',
    muted2: '#86868b',
    surface: '#ffffff',
    surfaceSoft: '#f5f5f7',
    border: 'rgba(0,0,0,.08)',
    borderSoft: '#e5e5ea',
    accent: '#ff7a00',
    accent2: '#ffb000',
    accentText: '#9a3412',
    accentSoft: 'rgba(255,122,0,.13)',
    accentSofter: 'rgba(255,122,0,.08)',
    accentBorder: 'rgba(255,122,0,.30)',
    accentLine: 'linear-gradient(90deg,#ff7a00 0%,#ffb000 46%,rgba(255,122,0,0) 100%)',
    codeBg: '#fff8f0',
    codeText: '#301607',
    codeHeaderBg: '#fff3e0',
    codeBorder: '#f4d7b8',
    shadow: '0 18px 46px rgba(122,63,0,.14)',
    softShadow: '0 12px 30px rgba(122,63,0,.08)'
  },
  appleBlue: {
    name: 'apple-blue',
    text: '#1d1d1f',
    textSoft: '#3a3a3c',
    muted: '#6e6e73',
    muted2: '#86868b',
    surface: '#ffffff',
    surfaceSoft: '#f5f5f7',
    border: 'rgba(0,0,0,.08)',
    borderSoft: '#e5e5ea',
    accent: '#0071e3',
    accent2: '#0a84ff',
    accentText: '#075985',
    accentSoft: 'rgba(0,113,227,.13)',
    accentSofter: 'rgba(0,113,227,.08)',
    accentBorder: 'rgba(0,113,227,.28)',
    accentLine: 'linear-gradient(90deg,#0071e3 0%,#0a84ff 46%,rgba(0,113,227,0) 100%)',
    codeBg: '#f5f8ff',
    codeText: '#172033',
    codeHeaderBg: '#eef5ff',
    codeBorder: '#cfe2ff',
    shadow: '0 18px 46px rgba(0,63,122,.14)',
    softShadow: '0 12px 30px rgba(0,63,122,.08)'
  },
  appleGold: {
    name: 'apple-gold',
    text: '#1c1917',
    textSoft: '#3f3a34',
    muted: '#74685d',
    muted2: '#9a8f82',
    surface: '#fffdf8',
    surfaceSoft: '#f7f3ea',
    border: 'rgba(121,85,35,.14)',
    borderSoft: '#e7ddcc',
    accent: '#b8862b',
    accent2: '#e7c56a',
    accentText: '#6f4a12',
    accentSoft: 'rgba(184,134,43,.16)',
    accentSofter: 'rgba(184,134,43,.09)',
    accentBorder: 'rgba(184,134,43,.34)',
    accentLine: 'linear-gradient(90deg,#8a611d 0%,#d6ad45 38%,#f1d98b 58%,rgba(214,173,69,0) 100%)',
    codeBg: '#fbf6ea',
    codeText: '#2f2414',
    codeHeaderBg: '#f4ead7',
    codeBorder: '#e1cfad',
    shadow: '0 20px 48px rgba(100,70,22,.16)',
    softShadow: '0 12px 30px rgba(100,70,22,.10)'
  }
} satisfies Record<string, WechatTheme>

export type WechatThemeName = keyof typeof WECHAT_THEMES

export const DEFAULT_WECHAT_THEME_NAME: WechatThemeName = 'appleGold'
export const WECHAT_THEME = WECHAT_THEMES[DEFAULT_WECHAT_THEME_NAME]

export function getWechatTheme(name: string | undefined): WechatTheme {
  return WECHAT_THEMES[(name as WechatThemeName) || DEFAULT_WECHAT_THEME_NAME] || WECHAT_THEME
}
