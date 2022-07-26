export default interface IDelta {
    ops: IOp[];
}
export interface IOp {
    insert?: any;
    delete?: number;
    retain?: number;
}
