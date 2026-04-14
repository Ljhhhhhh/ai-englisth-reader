import { afterEach, describe, expect, it } from 'vitest';
import {
  isClientLlmDebugEnabled,
  isServerLlmDebugEnabled,
} from './debug-config';

const originalNodeEnv = process.env.NODE_ENV;
const originalServerFlag = process.env.LLM_DEBUG_PANEL_ENABLED;
const originalClientFlag = process.env.NEXT_PUBLIC_LLM_DEBUG_PANEL_ENABLED;

describe('llm debug config', () => {
  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.LLM_DEBUG_PANEL_ENABLED = originalServerFlag;
    process.env.NEXT_PUBLIC_LLM_DEBUG_PANEL_ENABLED = originalClientFlag;
  });

  it('stays disabled outside development even when legacy flags are set', () => {
    process.env.NODE_ENV = 'production';
    process.env.LLM_DEBUG_PANEL_ENABLED = 'true';
    process.env.NEXT_PUBLIC_LLM_DEBUG_PANEL_ENABLED = '1';

    expect(isServerLlmDebugEnabled()).toBe(false);
    expect(isClientLlmDebugEnabled()).toBe(false);
  });

  it('enables both server and client debug only in development', () => {
    process.env.NODE_ENV = 'development';

    expect(isServerLlmDebugEnabled()).toBe(true);
    expect(isClientLlmDebugEnabled()).toBe(true);
  });
});
