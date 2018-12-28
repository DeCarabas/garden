namespace Garden
{
    class Garden
    {
        GardenChunk[] chunks;

        public Garden(GardenChunk[] chunks)
        {
            this.chunks = chunks;
        }

        public GardenChunk[] Chunks => chunks;
        public const int Width = 8;
        public const int Height = 8;
        public const int MaxWorldX = Width * (GardenChunk.Width - 1);
        public const int MaxWorldZ = Height * (GardenChunk.Height - 1);
        public const float MaxElevation = GardenChunk.MaxElevation;


        public static Garden Generate()
        {
            var chunks = new GardenChunk[Width * Height];
            for (int y = 0; y < Height; y++)
            {
                for (int x = 0; x < Width; x++)
                {
                    int wx = x * (GardenChunk.Width - 1);
                    int wy = y * (GardenChunk.Height - 1);
                    chunks[Index(x, y)] = GardenChunk.Generate(wx, wy);
                }
            }
            return new Garden(chunks);
        }

        public static int Index(int x, int y) => (y * Width) + x;
    }
}