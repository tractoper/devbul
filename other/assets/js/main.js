class Entity {
    constructor(id, position, mirrored, type, action, chars) {
        this.id = id;
        this.position = position;
        this.mirrored = mirrored;
        this.type = type;
        this.action = action;
        this.chars = chars;
    }
    get width() {
        let width;
        try {
            width = parseInt(getComputedStyle(document.getElementById(this.id)).width);
        } catch {
            width = 0;
        }
        return width;
    }
    move(direction) {
        if (direction === 'left' &&
            this.position - this.chars.step >= 0) {
            this.action = 'walking';
            this.mirrored = true;
            this.position -= this.chars.step;
            if (this.id === 'player' &&
                this.position + main.game.position < main.game.scrWidth / 2 - 50 &&
                -main.game.position - this.chars.step >= 0)
                main.game.position += this.chars.step;
        }
        if (direction === 'right' &&
            this.position + this.chars.step + this.width <= main.game.width) {
            this.action = 'walking';
            this.mirrored = false;
            this.position += this.chars.step;
            if (this.id === 'player' &&
                this.position + main.game.position + this.width > main.game.scrWidth / 2 + 50 &&
                -main.game.position + this.chars.step + main.game.scrWidth <= main.game.width)
                main.game.position -= this.chars.step;
        }
    }
    collision(othEntity) {
        let fb = this.position;
        let fe = this.width + fb;
        let sb = othEntity.position;
        let se = othEntity.width + sb;
        return  (fb < sb && sb < fe) ||
                (sb < fb && fb < se) ||
                (fb < se && se < fe) ||
                (sb < fe && fe < se);
    }
    visible() {
        return -main.game.position < this.position + this.width &&
                this.position < -main.game.position + main.game.scrWidth;
    }
    hit(damage) {
        if (!this.chars.hittable) return;
        this.chars.hp -= damage;
        if (this.id === 'player' && this.chars.shield) {
            if (this.chars.ep >= 5) {
                this.chars.ep -= 5;
                this.chars.hp += damage;
            }
            else
                this.chars.shield = false;
        }
    }
    waiting() {
        if (this.chars.wait.reload.noAction > 0) {
            this.chars.wait.reload.noAction--;
            return false;
        }
        if (this.chars.wait.reload.attack > 0)
            this.chars.wait.reload.attack--;
        if (this.id === 'player') {
            if (this.chars.wait.reload.fireball > 0)
                this.chars.wait.reload.fireball--;
			this.action = 'attacking';
            if (this.chars.wait.reload.rain > 0)
                this.chars.wait.reload.rain--;
        }
        return true;
    }
    attack(fn) {
        this.action = 'attacking';
        this.chars.wait.reload.noAction = this.chars.wait.time.noAction;
        this.chars.wait.reload.attack = this.chars.wait.time.attack;
        fn();
    }
}
class Player extends Entity {
    constructor() {
        let chars = {
            hittable: true,
            hp: 100,
            ep: 100,
            damage: 15,
            step: 20,
            do: '',
            shield: false,
            wait: {
                time: {
                    attack: 5,
                    noAction: 11,
                    fireball: 9,
                    rain: 300
                },
                reload: {
                    attack: 0,
                    noAction: 0,
                    fireball: 0,
                    rain: 0
                }
            }
        };
        super('player', 100, false, 'wizard', 'staing', chars);
    }
    update() {
        if (this.chars.hp <= 0 ||
            this.position + this.width + this.chars.step >= main.game.width)
            return true;
        if (main.game.ticks % 20 === 0) {
            this.chars.hp += 2;
            this.chars.ep += 5;
            if (this.chars.hp > 100) this.chars.hp = 100;
            if (this.chars.ep > 100) this.chars.ep = 100;
        }
        if (this.waiting()) {
            if (this.chars.do === 'left' || this.chars.do === 'right')
                this.move(this.chars.do);
            else if (this.chars.do === 'attack' && this.chars.wait.reload.attack === 0)
                this.attack(() => {
                    main.game.entities.forEach((entity) => {
                        if (entity.id !== 'player' && this.collision(entity))
                            entity.hit(this.chars.damage);
                    });
                });
            else if (this.chars.do === 'fireball' && this.chars.wait.reload.fireball === 0)
                this.fireball();
            else if (this.chars.do === 'rain' && this.chars.wait.reload.rain === 0)
                this.rain();
            else
                this.action = 'staing';
        }
        this.chars.do = '';
        return false;
    }
    fireball() {
        this.chars.wait.reload.fireball = this.chars.wait.time.fireball;
        main.game.entities.push(new Fireball(this.position + Math.floor(this.width / 2), this.mirrored));
    }
    rain() {
        this.chars.wait.reload.rain = this.chars.wait.time.rain;
        main.game.entities.push(new Rain());
    }
}
class Enemy extends Entity {
    update() {
        if (this.chars.hp <= 0)
            return true;
        if (this.waiting() && (this.visible() || this.position < player.position)) {
            let player = main.game.entities[0];
            if (this.collision(player)) {
                if (this.chars.wait.reload.attack === 0)
                    this.attack(() => {
                        player.hit(this.chars.damage);
                    });
                else
                    this.action = 'walking';
            } else
                this.move(this.position > player.position ? 'left' : 'right');
        }
        return false;
    }
}
class Fireball extends Entity {
    constructor(position, mirrored) {
        let chars = {
            hittable: false,
            damage: 4,
            step: 30,
            attacked: ['player', 'fireball', 'ice']
        };
        super('fireball', position, mirrored, 'skills', 'fireball', chars);
    }
    update() {
        if (!this.visible())
            return true;
        if (this.mirrored)
            this.position -= this.chars.step;
        else
            this.position += this.chars.step;
        main.game.entities.forEach((entity) => {
            if (this.collision(entity) && this.chars.attacked.indexOf(entity.id) === -1) {
                entity.hit(this.chars.damage);
                this.chars.attacked.push(entity.id);
            }
        });
        return false;
    }
}
class Rain extends Entity {
    constructor() {
        let position = -main.game.position;
        let chars = {
            hittable: false,
            damage: 100,
            step: 30,
            attacked: ['player', 'fireball', 'ice'],
            startPos: position
        };
        super('ice', position, false, 'skills', 'ice', chars);
    }
    update() {
        this.position += this.chars.step;
        main.game.entities.forEach((entity) => {
            if (this.collision(entity) && this.chars.attacked.indexOf(entity.id) === -1) {
                entity.hit(this.chars.damage);
                this.chars.attacked.push(entity.id);
            }
        });
        return this.position + this.width >= this.chars.startPos + main.game.scrWidth;
    }
}
class Game {
    constructor() {
        this.timerId = 0;
        this.ticks = 0;
        this.kills = 0;
        this.position = 0;
        this.paused = false;
        this.entities = [new Player].concat(Game.createEnemies(25));
    }
    get width() {
        return parseInt(getComputedStyle(document.getElementById('field')).width);
    }
    get scrWidth() {
        return parseInt(getComputedStyle(document.getElementById('game')).width);
    }
    get left() {
        return {
            left: this.position + 'px'
        };
    }
    get time() {
        return Game.timeFormat(Math.floor(this.ticks / 20));
    }
    static timeFormat(sec) {
        return  Math.floor(sec / 600) % 6 + '' +
                Math.floor(sec / 60) % 10 + ':' +
                Math.floor(sec / 10) % 6 + '' +
                sec % 10;
    }
    static rndInt(max) {
        return Math.floor(Math.random() * max);
    }
    static createEnemies(quantity) {
        let enemies = [];
        for (let i = 1; i <= quantity; i++) {
            enemies.push(Game.newEnemy(i, i * 400 + Game.rndInt(100)));
        }
        return enemies;
    }
    static newEnemy(id, position, tp = -1) {
        let type, chars;
        if (tp === -1) tp = Game.rndInt(3);
        switch (tp) {
            case 0:
                type = 'skeleton';
                chars = {
                    hittable: true,
                    hp: 15,
                    maxhp: 15,
                    damage: 3,
                    step: 20,
                    wait: {
                        time: {
                            attack: 2,
                            noAction: 11
                        },
                        reload: {
                            attack: 0,
                            noAction: 0
                        }
                    }
                };
                break;
            case 1:
                type = 'medusa';
                chars = {
                    hittable: true,
                    hp: 30,
                    maxhp: 30,
                    damage: 8,
                    step: 13,
                    wait: {
                        time: {
                            attack: 20,
                            noAction: 11
                        },
                        reload: {
                            attack: 0,
                            noAction: 0
                        }
                    }
                };
                break;
            case 2:
                type = 'minotaur';
                chars = {
                    hittable: true,
                    hp: 80,
                    maxhp: 80,
                    damage: 23,
                    step: 5,
                    wait: {
                        time: {
                            attack: 45,
                            noAction: 11
                        },
                        reload: {
                            attack: 0,
                            noAction: 0
                        }
                    }
                };
                break;
        }
        return new Enemy('enemy' + id, position, true, type, 'walking', chars);
    }
}
Vue.component('entity',{
    props: {
        entity: Object
    },
    computed: {
        image: function () {
            return 'assets/img/' + this.entity.type + '/' + this.entity.action + '.gif';
        },
        left: function () {
            return {
                left: this.entity.position + 'px'
            };
        },
        hashp: function () {
            return this.entity.type === 'skeleton' ||
                this.entity.type === 'medusa' ||
                this.entity.type === 'minotaur';
        }
    },
    template:  `<div class="entity" :style="left">
                <div v-if="hashp" class="panel-xp">
                <div class="score-value" :style="{width: (entity.chars.hp / entity.chars.maxhp * 100) + '%'}">
                <span>{{entity.chars.hp}}</span>
                </div>
                </div>
                <img :src="image" :class="{mirror: entity.mirrored}">
                </div>`
});
Vue.component('row',{
    props: {
        row: Object,
        lid: Number
    },
    computed: {
        time: function () {
            return Game.timeFormat(row.time);
        }
    },
    template: `<tr :class="{light: row.id == lid}"><td>{{row.id}}</td><td>{{row.username}}</td><td>{{row.score}}</td><td>{{time}}</td></tr>`
});
let main = new Vue({
    el: '#game',
    data: {
        name: '',
        screen: 'intro',
        game: {},
        table: {
            ready: false,
            data: [],
            id: 0
        }
    },
    methods: {
        start: function () {
            if (this.name.length = 'это равно фигня') {
                this.game = new Game;
                this.screen = 'play';
                this.table.ready = false;
                this.timerOn();
            }
        },
        end: function () {
            this.timerOff();
            let body = new FormData;
            body.append('username', this.name);
            body.append('score', this.game.kills);
            body.append('time', Math.floor(this.game.ticks / 20));
            fetch('../../php/register.php', {
                method: 'POST',
                body: body
            }).then(res => res.json())
                .then(res => {
                    let last = res.length;
                    res.sort((a, b) => b.score - a.score);
                    for (let i = 0; i < last; i++) {
                        if (res[i].id == last && i > 9) {
                            res[9] = res[i];
                            break;
                        }
                        res[i].id = i + 1;
                    }
                    res.splice(10, last-10);
                    this.table = {
                        ready: true,
                        data: res,
                        id: last
                    };
                });
            this.screen = 'rank';
            this.game = {};
        },
        pause: function () {
            if (this.game.paused)
                this.timerOn();
            else
                this.timerOff();
            this.game.paused = !this.game.paused;
        },
        tick: function () {
            this.game.ticks++;
            let end = false;
            let entities = this.game.entities;
            for (let i = 0; i < entities.length; i++) {
                if (entities[i].update()) {
                    if (entities[i].id === 'player')
                        end = true;
                    else {
                        if (entities[i].type !== 'skills')
                            this.game.kills++;
                        entities.splice(i, 1);
                        i--;
                    }
                }
            }
            if (end) this.end();
        },
        timerOn: function () {
            this.game.timerId = setInterval(this.tick, 50);
        },
        timerOff: function () {
            clearInterval(this.game.timerId);
        },
        keyDown: function (event) {
            if (this.screen === 'play') {
                let chars = this.game.entities[0].chars;
                switch (event.key) {
                    case 'ArrowLeft':
                        chars.do = 'left';
                        break;
                    case 'ArrowRight':
                        chars.do = 'right';
                        break;


                    case 'ArrowUp':
                        chars.do = 'fireball';
                        break;
                    case ' ':
                        chars.do = 'rain';
                        break;

                }
            }
        }
    },
    created: function () {
        window.addEventListener('keydown', this.keyDown);
    }
});