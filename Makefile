build/poolsim.js: src/physics.js src/objects.js src/table.js src/game.js src/agent.js src/export.js
	mkdir -p build
	echo "(function() {" >build/poolsim.js
	cat src/physics.js >>build/poolsim.js
	cat src/objects.js >>build/poolsim.js
	cat src/table.js >>build/poolsim.js
	cat src/game.js >>build/poolsim.js
	cat src/agent.js >>build/poolsim.js
	cat src/export.js >>build/poolsim.js
	echo "})();" >>build/poolsim.js

clean:
	rm -rf build