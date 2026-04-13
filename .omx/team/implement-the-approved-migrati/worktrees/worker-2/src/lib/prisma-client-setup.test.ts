import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('prisma client setup', () => {
  it('generates prisma client during install', () => {
    const pkg = JSON.parse(
      readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'),
    ) as {
      scripts?: Record<string, string>;
    };

    expect(pkg.scripts?.postinstall).toEqual(
      expect.stringContaining('prisma generate'),
    );
  });
});
