/* eslint-disable no-underscore-dangle */
import Action, { type ActionDoc } from './action.js';

class ActionManager {
  private readonly _actionDocs: ActionDoc[];

  private readonly _actionMap: Record<string, Action>;

  constructor(actions: Action[] = []) {
    this._actionDocs = actions.map((action) => action.doc);

    this._actionMap = actions.reduce((o, action) => ({ ...o, [action.doc.name]: action }), {});
  }

  public addAction(action: Action) {
    this._actionDocs.push(action.doc);
    this._actionMap[action.doc.name] = action;
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
}

export default ActionManager;
