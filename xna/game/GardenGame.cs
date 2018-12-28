using System;
using Microsoft.Xna.Framework;
using Microsoft.Xna.Framework.Graphics;
using Microsoft.Xna.Framework.Input;

namespace Garden
{
    class Garden
    {
        public const int Width = 128;
        public const int Height = 128;
        public const float MaxElevation = 100f;

        VertexPositionColor[] vertices;

        public Garden(ref VertexPositionColor[] vertices)
        {
            this.vertices = vertices;
            vertices = null;
        }

        public VertexPositionColor[] Vertices => this.vertices;

        public float Elevation(int x, int y) =>
            this.vertices[y * Width + x].Position.Y;

        public static int Index(int x, int y) => (y * Width) + x;

        public static Garden Generate()
        {
            var vertices = new VertexPositionColor[Width * Height];
            for (int y = 0; y < Height; y++)
            {
                for (int x = 0; x < Width; x++)
                {
                    float nx = (float)x / (float)Width;
                    float ny = (float)y / (float)Height;
                    float elevation = GenerateElevation(nx, ny);

                    float scale = elevation / MaxElevation;
                    vertices[Index(x, y)] = new VertexPositionColor(
                        new Vector3(x, elevation, y),
                        Color.Lerp(Color.DarkGreen, Color.White, scale));
                }
            }
            return new Garden(ref vertices);
        }

        static float GenerateElevation(float nx, float ny)
        {
            float elevation = 0;

            int octaves = 8;
            float max = 0.0f;
            for (int i = 0; i < octaves; i++)
            {
                float octave = i + 1;
                float scale = 1.0f / octave;
                max += scale;
                elevation += scale * Noise(octave * nx, octave * ny);
            }

            return (elevation / max) * MaxElevation;
        }

        static float Noise(float x, float y) =>
            (SimplexNoise.Generate(x, y) + 1f) / 2f;
    }

    class GardenGame : Game
    {
        GraphicsDeviceManager graphics;

        SpriteFont font;

        // For drawing squares.
        BasicEffect squareEffect;

        Garden garden;

        VertexBuffer gardenVertices;
        IndexBuffer gardenIndices;

        public GardenGame()
        {
            graphics = new GraphicsDeviceManager(this);
            Content.RootDirectory = "content";
        }

        protected override void LoadContent()
        {
            font = Content.Load<SpriteFont>("fonts/basic");

            squareEffect = new BasicEffect(GraphicsDevice);
        }

        protected override void UnloadContent()
        {
            font = null;
        }

        protected override void Update(GameTime gameTime)
        {
            if (garden == null)
            {
                garden = Garden.Generate();
                if (gardenIndices != null)
                {
                    gardenIndices.Dispose();
                    gardenIndices = null;
                }
                if (gardenVertices != null)
                {
                    gardenVertices.Dispose();
                    gardenVertices = null;
                }
            }

            MoveCamera();
            UpdateDebugGarbage();
        }


        const float scale = 1.0f;
        float pitch = 0.0f;
        float yaw = 0.0f;
        float zoom = 1.0f;
        Vector3 lookAt = new Vector3(
            scale * Garden.Width / 2f,
            scale * Garden.MaxElevation / 2f,
            scale * Garden.Height / 2f);


        void MoveCamera()
        {
            GamePadState state = GamePad.GetState(0);
            if (state.ThumbSticks.Right.X != 0)
            {
                // Turn left/right
                yaw += 0.05f * -state.ThumbSticks.Right.X;
            }

            if (state.ThumbSticks.Right.Y != 0)
            {
                // Turn up/down
                float pitch = this.pitch;
                pitch += 0.05f * -state.ThumbSticks.Right.Y;
                if (pitch > (float)Math.PI / 2.0f) { pitch = (float)Math.PI / 2.0f; }
                if (pitch < 0.0f) { pitch = 0.0f; }
                this.pitch = pitch;
            }

            if (state.Triggers.Right >= 0.5)
            {
                this.zoom = 0.25f;
            }

            if (state.Triggers.Left >= 0.5)
            {
                this.zoom = 1.0f;
            }
        }

        Matrix RecomputeProjection() =>
        // Matrix.CreateOrthographic(
        //     width: zoom * GraphicsDevice.Viewport.Width,
        //     height: zoom * GraphicsDevice.Viewport.Height,
        //     zNearPlane: 1f,
        //     zFarPlane: 1000f);
            Matrix.CreatePerspectiveFieldOfView(
                fieldOfView: zoom * (float)Math.PI / 4.0f,
                aspectRatio: GraphicsDevice.Viewport.AspectRatio,
                nearPlaneDistance: 0.1f,
                farPlaneDistance: 1000f);


        string cameraDebug = "";

        Matrix RecomputeView()
        {
            // First, turn the angle we're turned...
            Vector3 forward = Vector3.Transform(
                Vector3.UnitX,
                Matrix.CreateFromAxisAngle(Vector3.UnitY, this.yaw));

            // Now figure out the axis we're pitched around....
            Vector3 right = Vector3.Cross(forward, Vector3.UnitY);

            // And pitch around it...
            forward = Vector3.Transform(
                forward, Matrix.CreateFromAxisAngle(right, -this.pitch));

            // And now figure out which way is up!
            Vector3 up = Vector3.Cross(right, forward);

            // The camera sits a little away from the look-at point...
            Vector3 cameraPosition = lookAt - (forward * 250.0f);

            cameraDebug =
                $"f:{forward.Length():0.00} u:{up.Length():0.00} " +
                $"r:{right.Length():0.00}";
            return Matrix.CreateLookAt(cameraPosition, lookAt, up);
        }

        static string fv(Vector3 v) => $"[{v.X:0.000} {v.Y:0.000} {v.Z:0.000}]";

        static string fv(Vector4 v) =>
            $"[{v.X:0.000} {v.Y:0.000} {v.Z:0.000} {v.W:0.000}]";


        protected override void Draw(GameTime gameTime)
        {
            GraphicsDevice.Clear(Color.CornflowerBlue);

            // SpriteBatch disables the depth buffer; turn it back on again.
            GraphicsDevice.DepthStencilState = DepthStencilState.Default;

            squareEffect.View = RecomputeView();
            squareEffect.Projection = RecomputeProjection();
            squareEffect.World = Matrix.CreateScale(scale);
            squareEffect.VertexColorEnabled = true;

            if (gardenIndices == null)
            {
                int cursor = 0;

                int indexCount = (Garden.Width - 1) * (Garden.Height - 1) * 6;
                short[] indices = new short[indexCount];
                for (int y = 0; y < Garden.Height - 1; y++)
                {
                    for (int x = 0; x < Garden.Width - 1; x++)
                    {
                        indices[cursor + 0] = (short)Garden.Index(x + 0, y + 1);
                        indices[cursor + 1] = (short)Garden.Index(x + 0, y + 0);
                        indices[cursor + 2] = (short)Garden.Index(x + 1, y + 1);

                        indices[cursor + 3] = (short)Garden.Index(x + 1, y + 1);
                        indices[cursor + 4] = (short)Garden.Index(x + 0, y + 0);
                        indices[cursor + 5] = (short)Garden.Index(x + 1, y + 0);

                        cursor += 6;
                    }
                }
                gardenIndices = new IndexBuffer(
                    GraphicsDevice,
                    typeof(short),
                    indices.Length,
                    BufferUsage.WriteOnly);
                gardenIndices.SetData(indices);
            }

            if (gardenVertices == null)
            {
                VertexPositionColor[] vertices = garden.Vertices;
                gardenVertices = new VertexBuffer(
                    GraphicsDevice,
                    typeof(VertexPositionColor),
                    vertices.Length,
                    BufferUsage.WriteOnly);
                gardenVertices.SetData(vertices);
            }

            GraphicsDevice.Indices = gardenIndices;
            GraphicsDevice.SetVertexBuffer(gardenVertices);
            foreach (EffectPass pass in squareEffect.CurrentTechnique.Passes)
            {
                pass.Apply();
                GraphicsDevice.DrawIndexedPrimitives(
                    primitiveType: PrimitiveType.TriangleList,
                    baseVertex: 0,
                    startIndex: 0,
                    primitiveCount: gardenIndices.IndexCount / 3);
            }

            DrawDebugGarbage(gameTime);
        }

        int dbgi_x = 0;
        int dbgi_y = 0;

        void UpdateDebugGarbage()
        {
            GamePadState state = GamePad.GetState(0);
            if (state.IsButtonDown(Buttons.DPadDown)) { dbgi_y++; }
            if (state.IsButtonDown(Buttons.DPadUp)) { dbgi_y--; }
            if (state.IsButtonDown(Buttons.DPadLeft)) { dbgi_x++; }
            if (state.IsButtonDown(Buttons.DPadRight)) { dbgi_x--; }
            dbgi_x = MathHelper.Clamp(dbgi_x, 0, Garden.Width - 1);
            dbgi_y = MathHelper.Clamp(dbgi_y, 0, Garden.Height - 1);
        }

        void DrawDebugGarbage(GameTime gameTime)
        {
            var fps = 1.0 / gameTime.ElapsedGameTime.TotalSeconds;

            var dbgi = Garden.Index(dbgi_x, dbgi_y);
            var dbg = garden.Vertices[dbgi];

            var cat = (squareEffect.World * squareEffect.View * squareEffect.Projection);
            var p2 = Vector4.Transform(new Vector4(dbg.Position, 1), cat);
            var pp = GraphicsDevice.Viewport.Project(
                dbg.Position,
                squareEffect.Projection,
                squareEffect.View,
                squareEffect.World);

            var spriteBatch = new SpriteBatch(GraphicsDevice);
            spriteBatch.Begin();
            spriteBatch.DrawString(
                font,
                $"{fps:0.00} {zoom:0.00} {yaw:0.00} {fv(dbg.Position)} {fv(p2)} {fv(pp)}",
                new Vector2(10, 10),
                Color.White);

            Vector2 xp = new Vector2(pp.X - 6, pp.Y - 6);
            spriteBatch.DrawString(font, "X", xp, Color.White);
            spriteBatch.End();
        }
    }

}
