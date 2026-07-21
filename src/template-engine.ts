/**
 * Template engine — handles custom Handlebars templates
 */

import { readFileSync } from 'fs';
import * as handlebars from 'handlebars';
import { ReleaseNote } from './models.js';

// Register custom Handlebars helpers
handlebars.registerHelper('ifEquals', function (this: Record<string, unknown>, arg1: string, arg2: string, options: handlebars.HelperOptions) {
  return arg1 === arg2 ? options.fn(this) : options.inverse(this);
});

handlebars.registerHelper('upper', function (this: Record<string, unknown>, str: string) {
  return str.toUpperCase();
});

handlebars.registerHelper('capitalize', function (this: Record<string, unknown>, str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
});

export class TemplateEngine {
  constructor() {
    // Config available for future template customization
  }

  /**
   * Render a release note using a custom template
   */
  render(release: ReleaseNote, templatePath?: string): string {
    let template: string;

    if (templatePath) {
      template = readFileSync(templatePath, 'utf-8');
    } else {
      template = this.getDefaultTemplate();
    }

    const compiled = handlebars.compile(template);
    return compiled(release);
  }

  /**
   * Get the default Handlebars template
   */
  private getDefaultTemplate(): string {
    return `# Release {{version}}

**Date:** {{date}}
**Tag:** \`{{tag}}\`
{{#if previousTag}}**From:** \`{{previousTag}}\`{{/if}}

> {{summary}}

**Impact:** {{impactScore}}/100 - {{impactLevel}}

**Commits:** {{totalCommits}} | **Added:** {{totalAdditions}} | **Deleted:** {{totalDeletions}}

{{#each groups}}
## {{emoji}} {{label}}

{{#each commits}}
- [{{shortHash}}]({{{../repository}}}/commit/{{shortHash}}) {{#if scope}}\`{{scope}}\` {{/if}}{{message}}
{{/each}}

{{/each}}

### Contributors

{{#each contributors}}
- {{this}}
{{/each}}`;
  }

  /**
   * Validate a template file exists and is readable
   */
  static validateTemplate(templatePath: string): boolean {
    try {
      const content = readFileSync(templatePath, 'utf-8');
      handlebars.compile(content);
      return true;
    } catch {
      return false;
    }
  }
}
