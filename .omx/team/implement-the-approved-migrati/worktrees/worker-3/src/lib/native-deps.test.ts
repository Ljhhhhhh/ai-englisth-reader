import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('native dependency setup', () => {
  it('allows better-sqlite3 build scripts during install', () => {
    const pkg = JSON.parse(
      readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'),
    ) as {
      pnpm?: {
        onlyBuiltDependencies?: string[];
      };
    };

    expect(pkg).toMatchObject({
      pnpm: {
        onlyBuiltDependencies: expect.arrayContaining(['better-sqlite3']),
      },
    });
  });
});
