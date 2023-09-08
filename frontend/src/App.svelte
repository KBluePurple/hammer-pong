<script lang="ts">
    import * as Phaser from 'phaser';
    import {MainScene} from "./game/mainScene";
    import {onDestroy, onMount} from "svelte";

    let parent: HTMLDivElement;
    let game: Phaser.Game | null = null;

    onMount(() => {
        const config: Phaser.Types.Core.GameConfig = {
            type: Phaser.AUTO,
            width: 800,
            height: 600,
            physics: {
                default: 'arcade',
                arcade: {
                    gravity: { y: 0 },
                    debug: false
                }
            },
            scene: MainScene,
            parent: parent,
        };

        game = new Phaser.Game(config);
    });

    onDestroy(() => {
        if (game) {
            game.destroy(true);
            game = null;
        }
    });
</script>

<main class="flex justify-center content-center items-center w-full h-screen">
    <div bind:this={parent} />
</main>

<style>
    div {
        width: 800px;
        height: 600px;
    }
</style>
