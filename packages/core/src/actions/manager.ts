/* eslint-disable no-underscore-dangle */
import { encode } from 'gpt-tokenizer';
import Action, { type ActionDoc } from './action.js';

class ActionManager {
  private readonly _actionDocs: ActionDoc[];

  private readonly _actionMap: Record<string, Action>;

  private _tokens: number;

  private needUpdateTokens = true;

  constructor(actions: Action[] = []) {
    this._actionDocs = actions.map((action) => action.doc);

    this._actionMap = actions.reduce((o, action) => ({ ...o, [action.doc.name]: action }), {});
  }

  public addAction(action: Action) {
    this._actionDocs.push(action.doc);
    this._actionMap[action.doc.name] = action;
    this.needUpdateTokens = true;
  }

  public addActions(...toAdd: Action[]) {
    toAdd.forEach((action) => this.addAction(action));
  }

  public get actionDocs(): ActionDoc[] {
    return this._actionDocs;
  }

  public get actionMap(): Record<string, Action> {
    return this._actionMap;
  }

  public get tokens(): number {
    if (this.needUpdateTokens) {
      this._tokens = encode(JSON.stringify(this.actionDocs)).length;
      this.needUpdateTokens = false;
    }
    return this._tokens;
  }
}

export default ActionManager;
