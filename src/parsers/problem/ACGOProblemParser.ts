import { Sendable } from '../../models/Sendable';
import { TaskBuilder } from '../../models/TaskBuilder';
import { htmlToElement } from '../../utils/dom';
import { Parser } from '../Parser';

type AcgoNextData = {
  props?: {
    pageProps?: {
      questionInfo?: {
        questionCode?: string;
        questionTitle?: string;
        timeLimit?: string;
        memoryLimit?: string;
        questionTypeObject?: {
          exampleGroupList?: Array<{
            inputSample?: string;
            outputSample?: string;
          }>;
        };
      };
    };
  };
};

export class ACGOProblemParser extends Parser {
  public getMatchPatterns(): string[] {
    return ['https://www.acgo.cn/problemset/info/*', 'https://acgo.cn/problemset/info/*'];
  }

  public async parse(url: string, html: string): Promise<Sendable> {
    const elem = htmlToElement(html);
    const task = new TaskBuilder('ACGO').setUrl(url);

    const parsedFromDom = this.parseFromDom(elem, task);
    if (!parsedFromDom) {
      this.parseFromNextData(elem, task);
    }

    return task.build();
  }

  private parseFromDom(elem: Element, task: TaskBuilder): boolean {
    const titleElem = elem.querySelector('h1');
    const title = titleElem?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    if (title.length === 0) {
      return false;
    }

    task.setName(title);

    const limitNodes = [...elem.querySelectorAll('p')].map(node => node.textContent?.trim() ?? '');
    const timeLimitText = limitNodes.find(text => text.includes('时间限制'));
    const memoryLimitText = limitNodes.find(text => text.includes('内存限制'));

    const timeLimitMs = this.parseTimeLimit(timeLimitText);
    if (timeLimitMs !== null) {
      task.setTimeLimit(timeLimitMs);
    }

    const memoryLimitMb = this.parseMemoryLimit(memoryLimitText);
    if (memoryLimitMb !== null) {
      task.setMemoryLimit(memoryLimitMb);
    }

    const exampleItems = elem.querySelectorAll('li.QuestionStem_exampleItem__5DBmt');
    for (const item of exampleItems) {
      const blocks = item.querySelectorAll('pre');
      for (let i = 0; i < blocks.length - 1; i += 2) {
        task.addTest(blocks[i].textContent ?? '', blocks[i + 1].textContent ?? '');
      }
    }

    return task.tests.length > 0;
  }

  private parseFromNextData(elem: Element, task: TaskBuilder): void {
    const nextData = this.getNextData(elem);
    const questionInfo = nextData.props?.pageProps?.questionInfo;

    if (questionInfo === undefined) {
      throw new Error('ACGO __NEXT_DATA__ question info not found');
    }

    const nameParts = [questionInfo.questionCode, questionInfo.questionTitle]
      .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
      .map(part => part.trim());
    task.setName(nameParts.join(' ').trim());

    const timeLimitMs = this.parseTimeLimit(questionInfo.timeLimit);
    if (timeLimitMs !== null) {
      task.setTimeLimit(timeLimitMs);
    }

    const memoryLimitMb = this.parseMemoryLimit(questionInfo.memoryLimit);
    if (memoryLimitMb !== null) {
      task.setMemoryLimit(memoryLimitMb);
    }

    const examples = questionInfo.questionTypeObject?.exampleGroupList ?? [];
    for (const example of examples) {
      task.addTest(example.inputSample ?? '', example.outputSample ?? '');
    }
  }

  private getNextData(elem: Element): AcgoNextData {
    const script = elem.querySelector('#__NEXT_DATA__');
    if (script === null || script.textContent === null) {
      throw new Error('ACGO __NEXT_DATA__ script not found');
    }

    return JSON.parse(script.textContent) as AcgoNextData;
  }

  private parseTimeLimit(limit: string | undefined): number | null {
    if (typeof limit !== 'string') {
      return null;
    }

    const match = /([0-9.]+)\s*(ms|s)/i.exec(limit);
    if (match === null) {
      return null;
    }

    const value = parseFloat(match[1]);
    return match[2].toLowerCase() === 's' ? Math.floor(value * 1000) : Math.floor(value);
  }

  private parseMemoryLimit(limit: string | undefined): number | null {
    if (typeof limit !== 'string') {
      return null;
    }

    const match = /([0-9.]+)\s*(mb|kb|gb)/i.exec(limit);
    if (match === null) {
      return null;
    }

    const value = parseFloat(match[1]);
    const unit = match[2].toLowerCase();

    if (unit === 'gb') {
      return Math.floor(value * 1024);
    }

    if (unit === 'kb') {
      return Math.floor(value / 1024);
    }

    return Math.floor(value);
  }
}
