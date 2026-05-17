<script lang="ts">
  let { slug }: { slug: string } = $props();

  const allImages = import.meta.glob('/src/lib/assets/*_waiting.{jpg,jpeg,png}', {
    eager: true,
    import: 'default'
  });

  const imageUrl = $derived(
    (allImages[`/src/lib/assets/${slug}_waiting.jpg`] ||
      allImages[`/src/lib/assets/${slug}_waiting.jpeg`] ||
      allImages[`/src/lib/assets/${slug}_waiting.png`]) as string | undefined
  );
</script>

<div class="waiting-screen">
  {#if imageUrl}
    <img src={imageUrl} alt="Getting ready..." />
  {:else}
    <p>Getting ready...</p>
  {/if}
</div>

<style>
  .waiting-screen {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
  }

  img {
    max-width: 100%;
    max-height: 80vh;
    object-fit: contain;
  }
</style>
