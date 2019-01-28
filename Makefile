build/poolsim.js: src/physics.js src/export.js
	mkdir -p build
	echo "(function() {" >build/poolsim.js
	cat src/physics.js >>build/poolsim.js
	cat src/export.js >>build/poolsim.js
	echo "})();" >>build/poolsim.js
