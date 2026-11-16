// Approximate full-size badminton center-court arena envelope in metres.
export const ARENA = Object.freeze({
 width:50, length:64, halfWidth:25, halfLength:32,
 wallHeight:20, roofY:20.55,
 sideStandRows:18, sideStandSeats:54, endStandRows:12, endStandSeats:55,
});
export const ARENA_AUDIENCE_CAPACITY=2*ARENA.sideStandRows*ARENA.sideStandSeats+ARENA.endStandRows*ARENA.endStandSeats;
