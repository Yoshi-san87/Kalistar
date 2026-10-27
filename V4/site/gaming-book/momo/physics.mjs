import { stairLandingLayout } from './props.mjs';

export function createWorld(Matter, config) {
  const { Engine, Bodies, Body, Composite } = Matter;
  const { width, groundY, startX, bodyWidth, bodyHeight, speed } = config.world;
  const engine = Engine.create({ enableSleeping: true, gravity: { x: 0, y: 1 } });
  const body = Bodies.rectangle(startX, groundY - bodyHeight / 2, bodyWidth, bodyHeight, {
    inertia: Infinity, friction: 0, frictionAir: 0, restitution: 0, slop: 0.01, label: 'Momo',
  });
  const ground = Bodies.rectangle(width / 2, groundY + 70, width + 100, 140, { isStatic: true, friction: 0, label: 'walkway' });
  const landing=stairLandingLayout(config);
  const walls = [
    Bodies.rectangle(-10, groundY - 100, 20, 400, { isStatic: true }),
    Bodies.rectangle(width + 10, groundY - 100, 20, 400, { isStatic: true }),
    ...config.obstacles.map(({ collider: r }) => Bodies.rectangle(r.x, r.y, r.width, r.height, { isStatic: true, friction: 0, label: 'scrap' })),
    Bodies.rectangle(landing.x+landing.width/2,landing.y+landing.height/2,landing.width,landing.height,{isStatic:true,friction:0,label:'landing'}),
  ];
  Composite.add(engine.world, [ground, body, ...walls]);
  return {
    engine, body,
    place(x,y,kinematic=false) {
      Body.setStatic(body,kinematic);
      Body.setPosition(body,{x,y:y-bodyHeight/2});
      Body.setVelocity(body,{x:0,y:0});
    },
    step(direction, ms = 1000 / 60) {
      Matter.Sleeping.set(body, false);
      Body.setVelocity(body, { x: direction * speed / 60, y: body.velocity.y });
      Engine.update(engine, ms);
      return { x: body.position.x, y: body.position.y + bodyHeight / 2 };
    },
    dispose() { Composite.clear(engine.world, false); Engine.clear(engine); },
  };
}
