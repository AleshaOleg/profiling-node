cmd_Release/cpu_profiler.format.benchmark.node := c++ -bundle -undefined dynamic_lookup -Wl,-search_paths_first -mmacosx-version-min=10.13 -arch arm64 -L./Release -stdlib=libc++ -L/opt/homebrew/Cellar/gettext/0.21/lib -o Release/cpu_profiler.format.benchmark.node Release/obj.target/cpu_profiler.format.benchmark/src/bindings/cpu_profiler.o 